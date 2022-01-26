export async function delay(millisecond: number) {
	await new Promise((resolve) => setTimeout(resolve, millisecond));
}
