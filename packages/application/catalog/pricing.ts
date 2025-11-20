import type { SelectedOption, SelectedOptionGroup } from '@pos/domain/orders/types';

function sumOptionPrice(option: SelectedOption): number {
  const childrenDelta = option.child_groups?.reduce((sum, group) => sum + sumGroupPrice(group), 0) ?? 0;
  return option.price_delta + childrenDelta;
}

function sumGroupPrice(group: SelectedOptionGroup): number {
  return group.selected_options.reduce((sum, option) => sum + sumOptionPrice(option), 0);
}

export function calculateSelectedOptionsDelta(
  selectedOptions?: SelectedOption[],
  selectedOptionGroups?: SelectedOptionGroup[]
): number {
  const directDelta = selectedOptions?.reduce((sum, option) => sum + sumOptionPrice(option), 0) ?? 0;
  const groupDelta = selectedOptionGroups?.reduce((sum, group) => sum + sumGroupPrice(group), 0) ?? 0;

  return directDelta + groupDelta;
}

export function flattenSelectedOptions(
  selectedOptions?: SelectedOption[],
  selectedOptionGroups?: SelectedOptionGroup[]
): SelectedOption[] {
  const flattened: SelectedOption[] = [];

  const walkOption = (option: SelectedOption): void => {
    flattened.push({ ...option, child_groups: option.child_groups });
    option.child_groups?.forEach(group => {
      group.selected_options.forEach(childOption => walkOption(childOption));
    });
  };

  selectedOptions?.forEach(option => walkOption(option));
  selectedOptionGroups?.forEach(group => {
    group.selected_options.forEach(option => walkOption(option));
  });

  return flattened;
}
