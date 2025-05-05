[**cfs-ccm-lib**](../README.md)

***

[cfs-ccm-lib](../README.md) / TokenAuthorizer

# Class: TokenAuthorizer

Defined in: [src/auth/token/token.ts:27](#)

## Extends

- [`AuthorizerBase`](../-internal-/classes/AuthorizerBase.md)

## Constructors

### Constructor

> **new TokenAuthorizer**(`authConfig`): `TokenAuthorizer`

Defined in: [src/auth/token/token.ts:38](#)

#### Parameters

##### authConfig

[`TokenAuthConfig`](../interfaces/TokenAuthConfig.md)

#### Returns

`TokenAuthorizer`

#### Overrides

[`AuthorizerBase`](../-internal-/classes/AuthorizerBase.md).[`constructor`](../-internal-/classes/AuthorizerBase.md#constructor)

## Properties

### DEFAULT\_HTTP\_HEADER

> `static` **DEFAULT\_HTTP\_HEADER**: `string` = `'Authorization'`

Defined in: [src/auth/token/token.ts:28](#)

***

### DEFAULT\_HTTP\_PREFIX

> `static` **DEFAULT\_HTTP\_PREFIX**: `string` = `'Bearer '`

Defined in: [src/auth/token/token.ts:29](#)

## Methods

### onRequest()

> **onRequest**(`args0`): `Promise`\<[`Request`](../-internal-/interfaces/Request.md)\>

Defined in: [src/auth/token/token.ts:66](#)

#### Parameters

##### args0

`MiddlewareCallbackParams`

#### Returns

`Promise`\<[`Request`](../-internal-/interfaces/Request.md)\>

#### Overrides

[`AuthorizerBase`](../-internal-/classes/AuthorizerBase.md).[`onRequest`](../-internal-/classes/AuthorizerBase.md#onrequest)

***

### onResponse()

> **onResponse**(`args0`): `Promise`\<`undefined` \| [`Response`](../-internal-/interfaces/Response.md)\>

Defined in: [src/auth/token/token.ts:89](#)

#### Parameters

##### args0

`MiddlewareCallbackParams` & `object`

#### Returns

`Promise`\<`undefined` \| [`Response`](../-internal-/interfaces/Response.md)\>

***

### setAuthHeader()

> `protected` **setAuthHeader**(`__namedParameters`): [`Request`](../-internal-/interfaces/Request.md)

Defined in: [src/auth/authorizer.ts:61](#)

#### Parameters

##### \_\_namedParameters

###### auth

`string`

###### request

[`Request`](../-internal-/interfaces/Request.md)

#### Returns

[`Request`](../-internal-/interfaces/Request.md)

#### Inherited from

[`AuthorizerBase`](../-internal-/classes/AuthorizerBase.md).[`setAuthHeader`](../-internal-/classes/AuthorizerBase.md#setauthheader)
