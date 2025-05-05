[**cfs-ccm-lib**](../../README.md)

***

[cfs-ccm-lib](../../README.md) / [\<internal\>](../README.md) / UsersKeys

# Class: UsersKeys

Defined in: [src/gen/users-keys.ts:21](#)

## Constructors

### Constructor

> **new UsersKeys**(`apiClient`): `UsersKeys`

Defined in: [src/gen/users-keys.ts:26](#)

#### Parameters

##### apiClient

`Client`

#### Returns

`UsersKeys`

## Methods

### create()

> **create**(`args0`): `Promise`\<[`APIKey`](../../type-aliases/APIKey.md)\>

Defined in: [src/gen/users-keys.ts:37](#)

#### Parameters

##### args0

###### description?

`string`

###### readTags?

`string`[]

###### role?

`"user"` \| `"admin"`

###### writeTags?

`string`[]

#### Returns

`Promise`\<[`APIKey`](../../type-aliases/APIKey.md)\>

***

### delete()

> **delete**(`args0`): `Promise`\<`void`\>

Defined in: [src/gen/users-keys.ts:76](#)

#### Parameters

##### args0

###### appKey

`string`

#### Returns

`Promise`\<`void`\>

***

### list()

> **list**(`args0`): `AsyncGenerator`\<[`APIKey`](../../type-aliases/APIKey.md)\>

Defined in: [src/gen/users-keys.ts:98](#)

#### Parameters

##### args0

###### userID?

`string`

#### Returns

`AsyncGenerator`\<[`APIKey`](../../type-aliases/APIKey.md)\>
