[**cfs-ccm-lib**](../../README.md)

***

[cfs-ccm-lib](../../README.md) / [\<internal\>](../README.md) / Socfamilies

# Class: Socfamilies

Defined in: [src/gen/socfamilies.ts:21](#)

## Constructors

### Constructor

> **new Socfamilies**(`apiClient`): `Socfamilies`

Defined in: [src/gen/socfamilies.ts:26](#)

#### Parameters

##### apiClient

`Client`

#### Returns

`Socfamilies`

## Methods

### create()

> **create**(`args0`): `Promise`\<[`SoCFamily`](../../type-aliases/SoCFamily.md)\>

Defined in: [src/gen/socfamilies.ts:34](#)

#### Parameters

##### args0

###### name

`string`

#### Returns

`Promise`\<[`SoCFamily`](../../type-aliases/SoCFamily.md)\>

***

### get()

> **get**(`args0`): `Promise`\<[`SoCFamily`](../../type-aliases/SoCFamily.md)\>

Defined in: [src/gen/socfamilies.ts:61](#)

#### Parameters

##### args0

###### socFamilyID

`string`

#### Returns

`Promise`\<[`SoCFamily`](../../type-aliases/SoCFamily.md)\>

***

### list()

> **list**(): `AsyncGenerator`\<[`SoCFamily`](../../type-aliases/SoCFamily.md)\>

Defined in: [src/gen/socfamilies.ts:91](#)

#### Returns

`AsyncGenerator`\<[`SoCFamily`](../../type-aliases/SoCFamily.md)\>
