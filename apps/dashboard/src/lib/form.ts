// FormData.get() is string | File | null. A text input always yields a string;
// anything else means the form markup changed, which is a programmer error.
export function textField(form: FormData, name: string): string {
  const value = form.get(name);
  if (typeof value !== "string") throw new Error(`missing text field ${name}`);
  return value;
}
