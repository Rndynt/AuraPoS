/**
 * GetProductById Use Case
 * Retrieves a single product with full details including option groups and options
 */
export class GetProductById {
    constructor(productRepository) {
        this.productRepository = productRepository;
    }
    async execute(input) {
        try {
            const product = await this.productRepository.findById(input.productId);
            if (!product) {
                return { product: null };
            }
            if (product.tenant_id !== input.tenantId) {
                throw new Error('Product does not belong to the specified tenant');
            }
            const optionGroups = await this.productRepository.findOptionGroupsByProductId(product.id);
            if (optionGroups.length === 0) {
                return {
                    product: {
                        ...product,
                        option_groups: [],
                    },
                };
            }
            const groupIds = optionGroups.map(g => g.id);
            const optionsMap = await this.productRepository.findOptionsByGroupIds(groupIds);
            const groupsWithOptions = optionGroups.map(group => ({
                ...group,
                options: optionsMap.get(group.id) || [],
            }));
            return {
                product: {
                    ...product,
                    option_groups: groupsWithOptions,
                },
            };
        }
        catch (error) {
            throw new Error(`Failed to get product by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
