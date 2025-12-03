export function parseFieldName(fieldName: string): { field: any; FieldLabel: any; } {
    const parts = fieldName.split('|');
    const field = parts[0];
    const FieldLabel = parts[1] || splitSnakeCaseWords(splitCamelCaseWords(field, true));
    return { field, FieldLabel: FieldLabel.toUpperCase() };
}

export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export type ArrayElement<ArrayType extends readonly unknown[]> =
	ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

export function splitCamelCaseWords(str: string, titleCase: boolean = false): string {
	const result = str
		.replace(/([a-z]+)([A-Z]+)/g, '$1 $2')
		.split(' ')
		.filter((word) => word.length > 0)
		.map((word) => word.toLowerCase());
	if (!result.length) {
		return '';
	}
	return titleCase ? (result.map((word) => word.charAt(0).toUpperCase() + word.slice(1))).join(' ') : result.join(' ');
}

export function splitSnakeCaseWords(str: string, titleCase: boolean = false): string {
	const result = str
		.replace(/[_]+/g, ' ')
		.split(' ')
		.filter((word) => word.length > 0)
		.map((word) => word.toLowerCase());
	if (!result.length) {
		return '';
	}
	return titleCase ? (result.map((word) => word.charAt(0).toUpperCase() + word.slice(1))).join(' ') : result.join(' ');
}