
## Findings — AD/LDAP research

- Microsoft Learn states that AD DS can reject unsigned SASL LDAP binds and simple binds over cleartext; unsigned traffic is susceptible to replay and man-in-the-middle attacks. It recommends discovering legacy clients using Event ID 2887/2889 before enforcing signing through Group Policy.
- Microsoft guidance page: https://learn.microsoft.com/en-us/troubleshoot/windows-server/active-directory/enable-ldap-signing-in-windows-server
- The Keycloak Server Administration URL was not reachable in the browser during this pass, but the previously extracted official Keycloak OIDC documentation states that Keycloak exposes realm discovery, authorization, token, userinfo, logout and certificate endpoints; the implementation should use OIDC Authorization Code rather than direct password handling.
- Previously extracted Keycloak OIDC documentation: https://www.keycloak.org/securing-apps/oidc-layers
