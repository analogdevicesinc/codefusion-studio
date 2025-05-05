[**cfs-ccm-lib**](../README.md)

***

[cfs-ccm-lib](../README.md) / PublicAuthorizer

# Class: PublicAuthorizer

Defined in: [src/auth/public/public.ts:23](#)

## Extends

- [`AuthorizerBase`](../-internal-/classes/AuthorizerBase.md)

## Constructors

### Constructor

> **new PublicAuthorizer**(`authConfig?`): `PublicAuthorizer`

Defined in: [src/auth/public/public.ts:34](#)

#### Parameters

##### authConfig?

[`PublicAuthConfig`](../interfaces/PublicAuthConfig.md)

#### Returns

`PublicAuthorizer`

#### Overrides

[`AuthorizerBase`](../-internal-/classes/AuthorizerBase.md).[`constructor`](../-internal-/classes/AuthorizerBase.md#constructor)

## Properties

### DEFAULT\_HTTP\_HEADER

> `static` **DEFAULT\_HTTP\_HEADER**: `string` = `'Cfs-User'`

Defined in: [src/auth/public/public.ts:24](#)

***

### DEFAULT\_HTTP\_PREFIX

> `static` **DEFAULT\_HTTP\_PREFIX**: `string` = `''`

Defined in: [src/auth/public/public.ts:25](#)

***

### DEFAULT\_PUBLIC\_USER

> `static` **DEFAULT\_PUBLIC\_USER**: `string` = `'ANONYMOUS'`

Defined in: [src/auth/public/public.ts:26](#)

## Methods

### onRequest()

> **onRequest**(`args0`): `Promise`\<[`Request`](../-internal-/interfaces/Request.md)\>

Defined in: [src/auth/public/public.ts:55](#)

#### Parameters

##### args0

`MiddlewareCallbackParams`

#### Returns

`Promise`\<[`Request`](../-internal-/interfaces/Request.md)\>

#### Overrides

[`AuthorizerBase`](../-internal-/classes/AuthorizerBase.md).[`onRequest`](../-internal-/classes/AuthorizerBase.md#onrequest)

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
