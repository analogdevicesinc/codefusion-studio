[**cfs-ccm-lib**](../README.md)

***

[cfs-ccm-lib](../README.md) / TokenAuthConfig

# Interface: TokenAuthConfig

Defined in: [src/auth/token/token.ts:22](#)

## Extends

- `Partial`\<[`AuthConfigBase`](../-internal-/interfaces/AuthConfigBase.md)\>

## Properties

### accessToken

> **accessToken**: `string` \| () => `string`

Defined in: [src/auth/token/token.ts:23](#)

***

### httpHeader?

> `optional` **httpHeader**: `string`

Defined in: [src/auth/authorizer.ts:28](#)

#### Inherited from

`Partial.httpHeader`

***

### httpPrefix?

> `optional` **httpPrefix**: `string`

Defined in: [src/auth/authorizer.ts:29](#)

#### Inherited from

`Partial.httpPrefix`

## Methods

### refreshHandler()?

> `optional` **refreshHandler**(): `string`

Defined in: [src/auth/token/token.ts:24](#)

#### Returns

`string`
