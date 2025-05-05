[**cfs-ccm-lib**](../../README.md)

***

[cfs-ccm-lib](../../README.md) / [\<internal\>](../README.md) / Users

# Class: Users

Defined in: [src/gen/users.ts:21](#)

## Constructors

### Constructor

> **new Users**(`apiClient`): `Users`

Defined in: [src/gen/users.ts:26](#)

#### Parameters

##### apiClient

`Client`

#### Returns

`Users`

## Methods

### create()

> **create**(`args0`): `Promise`\<[`User`](../../type-aliases/User.md)\>

Defined in: [src/gen/users.ts:37](#)

#### Parameters

##### args0

###### email

`string`

###### readTags?

`string`[]

###### userType

`"user"` \| `"admin"`

###### writeTags?

`string`[]

#### Returns

`Promise`\<[`User`](../../type-aliases/User.md)\>

***

### delete()

> **delete**(`args0`): `Promise`\<`void`\>

Defined in: [src/gen/users.ts:73](#)

#### Parameters

##### args0

###### userID

`string`

#### Returns

`Promise`\<`void`\>

***

### list()

> **list**(): `AsyncGenerator`\<[`User`](../../type-aliases/User.md)\>

Defined in: [src/gen/users.ts:93](#)

#### Returns

`AsyncGenerator`\<[`User`](../../type-aliases/User.md)\>

***

### update()

> **update**(`args0`): `Promise`\<`void`\>

Defined in: [src/gen/users.ts:117](#)

#### Parameters

##### args0

###### readTags?

`string`[]

###### userID

`string`

###### userType?

`"user"` \| `"admin"`

###### writeTags?

`string`[]

#### Returns

`Promise`\<`void`\>
