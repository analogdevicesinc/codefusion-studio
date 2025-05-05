[**cfs-ccm-lib**](../../README.md)

***

[cfs-ccm-lib](../../README.md) / [\<internal\>](../README.md) / Coretypes

# Class: Coretypes

Defined in: [src/gen/coretypes.ts:21](#)

## Constructors

### Constructor

> **new Coretypes**(`apiClient`): `Coretypes`

Defined in: [src/gen/coretypes.ts:26](#)

#### Parameters

##### apiClient

`Client`

#### Returns

`Coretypes`

## Methods

### create()

> **create**(`args0`): `Promise`\<[`CoreType`](../../type-aliases/CoreType.md)\>

Defined in: [src/gen/coretypes.ts:36](#)

#### Parameters

##### args0

###### architecture

`string`

###### description?

`string`

###### isa

`string`

#### Returns

`Promise`\<[`CoreType`](../../type-aliases/CoreType.md)\>

***

### get()

> **get**(`args0`): `Promise`\<[`CoreType`](../../type-aliases/CoreType.md)\>

Defined in: [src/gen/coretypes.ts:73](#)

#### Parameters

##### args0

###### coreTypeID

`string`

#### Returns

`Promise`\<[`CoreType`](../../type-aliases/CoreType.md)\>

***

### list()

> **list**(): `AsyncGenerator`\<[`CoreType`](../../type-aliases/CoreType.md)\>

Defined in: [src/gen/coretypes.ts:103](#)

#### Returns

`AsyncGenerator`\<[`CoreType`](../../type-aliases/CoreType.md)\>
