[**cfs-ccm-lib**](../../README.md)

***

[cfs-ccm-lib](../../README.md) / [\<internal\>](../README.md) / Socs

# Class: Socs

Defined in: [src/gen/socs.ts:31](#)

## Constructors

### Constructor

> **new Socs**(`apiClient`): `Socs`

Defined in: [src/gen/socs.ts:36](#)

#### Parameters

##### apiClient

`Client`

#### Returns

`Socs`

## Methods

### create()

> **create**(`args0`): `Promise`\<[`SoC`](../../type-aliases/SoC.md)\>

Defined in: [src/gen/socs.ts:52](#)

#### Parameters

##### args0

###### accessTag?

[`AccessTag`](../../type-aliases/AccessTag.md)

###### boards?

[`CreateInputBoard`](../type-aliases/CreateInputBoard.md)[]

###### cores

[`CreateInputCore`](../type-aliases/CreateInputCore.md)[]

###### description

`string`

###### documentation?

[`Documentation`](../../type-aliases/Documentation.md)[]

###### family

[`CreateInputFamily`](../type-aliases/CreateInputFamily.md)

###### media?

[`Media`](../../type-aliases/Media.md)[]

###### name

`string`

###### packages?

[`CreateInputPackage`](../type-aliases/CreateInputPackage.md)[]

#### Returns

`Promise`\<[`SoC`](../../type-aliases/SoC.md)\>

***

### get()

> **get**(`args0`): `Promise`\<[`SoC`](../../type-aliases/SoC.md)\>

Defined in: [src/gen/socs.ts:104](#)

#### Parameters

##### args0

###### socID

`string`

#### Returns

`Promise`\<[`SoC`](../../type-aliases/SoC.md)\>

***

### list()

> **list**(): `AsyncGenerator`\<[`SoCSummary`](../../type-aliases/SoCSummary.md)\>

Defined in: [src/gen/socs.ts:130](#)

#### Returns

`AsyncGenerator`\<[`SoCSummary`](../../type-aliases/SoCSummary.md)\>
