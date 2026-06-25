/**
 * Utility function to retrieve the value of a cookie by name in client-side code.
 *
 * @param name Name of the cookie to retrieve.
 * @returns The string value of the cookie if found, or undefined.
 */
export function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
  return undefined;
}
