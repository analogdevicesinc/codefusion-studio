[**cfs-ccm-lib**](../../README.md)

***

[cfs-ccm-lib](../../README.md) / [\<internal\>](../README.md) / Resources

# Class: Resources

Defined in: [src/gen/resources.ts:21](#)

## Constructors

### Constructor

> **new Resources**(`apiClient`): `Resources`

Defined in: [src/gen/resources.ts:26](#)

#### Parameters

##### apiClient

`Client`

#### Returns

`Resources`

## Methods

### create()

> **create**(`args0`): `Promise`\<[`Resource`](../../type-aliases/Resource.md)\>

Defined in: [src/gen/resources.ts:38](#)

#### Parameters

##### args0

###### accessTag?

[`AccessTag`](../../type-aliases/AccessTag.md)

###### mediaType

`"article"` \| `"video"` \| `"tutorial"`

###### name

`string`

###### thumbnail?

`string`

###### url

`string`

#### Returns

`Promise`\<[`Resource`](../../type-aliases/Resource.md)\>

***

### delete()

> **delete**(`args0`): `Promise`\<`void`\>

Defined in: [src/gen/resources.ts:80](#)

#### Parameters

##### args0

###### resourceID

`string`

#### Returns

`Promise`\<`void`\>

***

### get()

> **get**(`args0`): `Promise`\<[`Resource`](../../type-aliases/Resource.md)\>

Defined in: [src/gen/resources.ts:107](#)

#### Parameters

##### args0

###### resourceID

`string`

#### Returns

`Promise`\<[`Resource`](../../type-aliases/Resource.md)\>

***

### list()

> **list**(): `AsyncGenerator`\<[`Resource`](../../type-aliases/Resource.md)\>

Defined in: [src/gen/resources.ts:137](#)

#### Returns

`AsyncGenerator`\<[`Resource`](../../type-aliases/Resource.md)\>

***

### update()

> **update**(`args0`): `Promise`\<`void`\>

Defined in: [src/gen/resources.ts:177](#)

#### Parameters

##### args0

###### accessTag?

[`AccessTag`](../../type-aliases/AccessTag.md)

###### mediaType

`"article"` \| `"video"` \| `"tutorial"`

###### name

`string`

###### resourceID

`string`

###### thumbnail?

`string`

###### url

`string`

#### Returns

`Promise`\<`void`\>
