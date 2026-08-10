import * as Linking from "expo-linking";

export function getVerifyRedirectUrl(screenName: string): string {
  const url = Linking.createURL(screenName);
  console.log(url);
  return url;
}
