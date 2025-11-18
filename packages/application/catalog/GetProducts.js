/**
 * GetProducts Use Case
 * Fetches products with option groups for a tenant
 */
export class GetProducts {
    constructor(productRepository) {
        this.productRepository = productRepository;
    }
    async execute(input) {
        try {
            let products = await this.productRepository.findByTenantId(input.tenantId);
            if (input.category) {
                products = products.filter(p => p.category === input.category);
            }
            if (input.isActive !== undefined) {
                products = products.filter(p => p.is_active === input.isActive);
            }
            if (products.length === 0) {
                return { products: [], total: 0 };
            }
            const productIds = products.map(p => p.id);
            const optionGroupsMap = await this.productRepository.findOptionGroupsByProductIds(productIds);
            const allGroupIds = [];
            for (const groups of Array.from(optionGroupsMap.values())) {
                allGroupIds.push(...groups.map((g) => g.id));
            }
            const optionsMap = allGroupIds.length > 0
                ? await this.productRepository.findOptionsByGroupIds(allGroupIds)
                : new Map();
            const productsWithOptions = products.map(product => {
                const groups = optionGroupsMap.get(product.id) || [];
                const groupsWithOptions = groups.map(group => ({
                    ...group,
                    options: optionsMap.get(group.id) || [],
                }));
                return {
                    ...product,
                    option_groups: groupsWithOptions,
                };
            });
            return {
                products: productsWithOptions,
                total: productsWithOptions.length,
            };
        }
        catch (error) {
            throw new Error(`Failed to get products: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
