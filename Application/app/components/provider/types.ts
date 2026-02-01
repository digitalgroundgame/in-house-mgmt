export interface EmailAddress {
  email: string;
  primary: boolean;
  verified: boolean;
}

export interface SocialAccount {
  provider: string;
  uid: string;
  last_login: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  groups: string[];
  email_addresses: EmailAddress[];
  social_accounts: SocialAccount[];
  timezone: string;
}
