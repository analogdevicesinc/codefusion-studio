/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import {useState} from 'react';
import RemotesView from './RemotesView';
import {resetStore, store} from '../../state/store';
import {remoteIndexingChanged} from '../../state/slices/remotes/remotes.reducer';
import {
	addRemoteRequest,
	customRemoteIndexingType,
	getRemotesRequest,
	packageManagerRemotesUpdatedType,
	removeRemoteRequest,
	setRemoteCredentialsRequest,
	setRemoteEnabledRequest,
	type PackageManagerRemote
} from '@constants/messages/package-manager-messages';
import {sendMockMessage} from '../../../../common/test-utils/messenger-mock';
import {
	mockPackageManager,
	type PackageManagerMock
} from '../../test-utils/package-manager-mock';
import {mountPackageManagerComponent} from '../../test-utils/mount';

/** Fresh objects for every test, since the mock backend edits them in place. */
const seedRemotes = (): PackageManagerRemote[] => [
	{
		name: 'my-remote',
		url: 'https://localhost:3001/',
		disabled: false,
		custom: true,
		auth: 'none'
	},
	{
		name: 'private-remote',
		url: 'https://example.com/private/',
		disabled: false,
		custom: true,
		auth: 'usernamePassword',
		username: 'jane'
	},
	{
		name: 'old-remote',
		url: 'https://example.com/old/',
		disabled: true,
		custom: true,
		auth: 'usernamePassword',
		username: 'joe'
	},
	{
		name: 'cfs-restricted',
		url: 'https://conan.cloudsmith.io/adi/codefusion-restricted/',
		disabled: false,
		custom: false,
		auth: 'myAnalog'
	},
	{
		name: 'cfs-public',
		url: 'https://conan.cloudsmith.io/adi/codefusion-public/',
		disabled: true,
		custom: false,
		auth: 'none'
	}
];

const findRemote = (name: string) =>
	store
		.getState()
		.remotesReducer.remotes.find(remote => remote.name === name);

/** Types into a `TextField`, whose native input sits in a shadow root. */
const typeInto = (dataTest: string, text: string) => {
	cy.dataTest(`${dataTest}-control-input`)
		.shadow()
		.find('input')
		.type(text);
};

const selectAuth = (label: string) => {
	cy.get('#remote-sidebar-auth-controlDropdown').click();
	cy.get('#remote-sidebar-auth-controlDropdown')
		.find('> vscode-option')
		.contains(label)
		.click();
};

const sidebarShouldBeOpen = (isOpen: boolean) => {
	cy.dataTest('remote-sidebar')
		.should('have.attr', 'class')
		.and(isOpen ? 'not.match' : 'match', /minimised/);
};

const toggleOf = (name: string) =>
	cy.get(`[data-test="remote-card:${name}"] input[type="checkbox"]`);

/** Waits until the backend has received `count` requests for `method`. */
const shouldHaveRequested = (
	pm: PackageManagerMock,
	method: string,
	count: number
) => {
	cy.wrap(pm).invoke('callCount', method).should('equal', count);
};

/** Keeps the Remotes tab hidden until the button is clicked. */
function HiddenRemotesView() {
	const [isActive, setIsActive] = useState(false);

	return (
		<>
			<button
				type='button'
				data-test='show-remotes'
				onClick={() => {
					setIsActive(true);
				}}
			>
				Show remotes
			</button>
			<RemotesView isActive={isActive} />
		</>
	);
}

describe('RemotesView', () => {
	let pm: PackageManagerMock;

	beforeEach(() => {
		cy.viewport(1920, 1080);
		store.dispatch(resetStore({}));
		pm = mockPackageManager({remotes: seedRemotes()});
	});

	describe('loading', () => {
		it('loads the remotes once the tab is first shown', () => {
			mountPackageManagerComponent(<HiddenRemotesView />);

			cy.dataTest('remotes:loading').should('exist');
			// A change reported before the first load doesn't load them either.
			cy.then(() => {
				sendMockMessage(packageManagerRemotesUpdatedType.method);
			});
			shouldHaveRequested(pm, getRemotesRequest.method, 0);

			cy.dataTest('show-remotes').click();

			cy.dataTest('remote-card:my-remote').should('exist');
			shouldHaveRequested(pm, getRemotesRequest.method, 1);
		});

		it('shows a loading state until the remotes arrive', () => {
			pm.hold(getRemotesRequest.method);
			mountPackageManagerComponent(<RemotesView isActive />);

			cy.dataTest('remotes:loading').should('exist');
			cy.dataTest('remotes:list').should('not.exist');

			cy.then(() => {
				pm.flush(getRemotesRequest.method);
			});

			cy.dataTest('remotes:loading').should('not.exist');
			cy.dataTest('remote-card:my-remote').should('exist');
		});

		it('offers a retry when the remotes cannot be loaded', () => {
			pm.fail(
				getRemotesRequest.method,
				'Package Manager not available'
			);
			mountPackageManagerComponent(<RemotesView isActive />);

			cy.dataTest('remotes:error')
				.should('contain.text', "Couldn't load remotes")
				.and('contain.text', 'Package Manager not available');

			cy.then(() => {
				pm.recover(getRemotesRequest.method);
			});
			cy.dataTest('remotes:error')
				.contains('button', 'Try again')
				.click();

			cy.dataTest('remotes:error').should('not.exist');
			cy.dataTest('remote-card:my-remote').should('exist');
		});
	});

	describe('adding', () => {
		beforeEach(() => {
			mountPackageManagerComponent(<RemotesView isActive />);
			cy.dataTest('remotes:list').should('exist');
			cy.dataTest('remotes:add').click();
			typeInto('remote-sidebar:name', 'new-remote');
			typeInto('remote-sidebar:url', 'https://example.com/conan');
		});

		it('adds a public custom remote', () => {
			cy.dataTest('remote-sidebar:submit').click();

			cy.dataTest('remote-card:new-remote:auth').should(
				'have.text',
				'No Auth'
			);
			cy.dataTest('remote-card:new-remote:configure').should('exist');
			cy.dataTest('remote-card:new-remote:delete').should('exist');
			sidebarShouldBeOpen(false);
			cy.then(() => {
				expect(pm.lastCall(addRemoteRequest.method)).to.deep.equal({
					name: 'new-remote',
					url: 'https://example.com/conan',
					credentials: {auth: 'none'}
				});
			});
		});

		it('passes the credentials on without keeping the password', () => {
			selectAuth('Username / Password');
			typeInto('remote-sidebar:username', 'jane');
			typeInto('remote-sidebar:password', 's3cret');
			cy.dataTest('remote-sidebar:submit').click();

			cy.dataTest('remote-card:new-remote:auth').should(
				'have.text',
				'Username / Password'
			);
			cy.then(() => {
				expect(pm.lastCall(addRemoteRequest.method)).to.deep.include({
					credentials: {
						auth: 'usernamePassword',
						username: 'jane',
						password: 's3cret'
					}
				});
				expect(JSON.stringify(store.getState())).not.to.contain(
					's3cret'
				);
			});
		});

		it('locks the form until the remote is added', () => {
			pm.hold(addRemoteRequest.method);
			cy.dataTest('remote-sidebar:submit').click();

			cy.dataTest('remote-sidebar:submit').should(
				'have.attr',
				'disabled'
			);
			cy.dataTest('remote-sidebar:name-control-input').should(
				'have.attr',
				'disabled'
			);
			cy.dataTest('remote-sidebar:auth').should(
				'have.attr',
				'disabled'
			);
			sidebarShouldBeOpen(true);

			cy.then(() => {
				pm.flush(addRemoteRequest.method);
			});

			cy.dataTest('remote-card:new-remote').should('exist');
			sidebarShouldBeOpen(false);
		});

		it('keeps the form open when the remote cannot be added', () => {
			pm.fail(addRemoteRequest.method, 'Invalid URL');
			cy.dataTest('remote-sidebar:submit').click();

			shouldHaveRequested(pm, addRemoteRequest.method, 1);
			cy.dataTest('remote-sidebar:submit').should(
				'not.have.attr',
				'disabled'
			);
			cy.dataTest('remote-sidebar:name-control-input').should(
				'not.have.attr',
				'disabled'
			);
			sidebarShouldBeOpen(true);
			cy.dataTest('remote-card:new-remote').should('not.exist');
		});

		it('leaves the other remotes usable while the remote is added', () => {
			pm.hold(addRemoteRequest.method);
			cy.dataTest('remote-sidebar:submit').click();
			cy.dataTest('remote-sidebar:submit').should(
				'have.attr',
				'disabled'
			);

			cy.dataTest('remote-card:my-remote:toggle-span').click();
			shouldHaveRequested(pm, setRemoteEnabledRequest.method, 1);
			cy.dataTest('remote-card:private-remote:configure').should(
				'not.have.attr',
				'disabled'
			);
			cy.dataTest('remote-sidebar:submit').should(
				'have.attr',
				'disabled'
			);

			cy.then(() => {
				pm.flush(addRemoteRequest.method);
			});

			sidebarShouldBeOpen(false);
		});

		it('keeps the form locked across a store reset', () => {
			pm.hold(addRemoteRequest.method);
			cy.dataTest('remote-sidebar:submit').click();

			cy.then(() => {
				store.dispatch(resetStore({}));
			});

			shouldHaveRequested(pm, getRemotesRequest.method, 2);
			cy.dataTest('remote-sidebar:submit').should(
				'have.attr',
				'disabled'
			);

			cy.then(() => {
				pm.flush(addRemoteRequest.method);
			});

			sidebarShouldBeOpen(false);
		});
	});

	describe('validating a new remote', () => {
		beforeEach(() => {
			mountPackageManagerComponent(<RemotesView isActive />);
			cy.dataTest('remotes:list').should('exist');
			cy.dataTest('remotes:add').click();
		});

		it('asks for a name and URL before adding', () => {
			cy.dataTest('remote-sidebar:submit').click();

			cy.dataTest('remote-sidebar:name-error').should(
				'have.text',
				'Enter a remote name.'
			);
			cy.dataTest('remote-sidebar:url-error').should(
				'have.text',
				'Enter a remote URL.'
			);
			cy.dataTest('remote-sidebar:submit').should(
				'have.attr',
				'disabled'
			);
			sidebarShouldBeOpen(true);
			shouldHaveRequested(pm, addRemoteRequest.method, 0);
		});

		it('only accepts names the package manager accepts', () => {
			typeInto('remote-sidebar:name', 'my.remote');

			cy.dataTest('remote-sidebar:name-error').should(
				'have.text',
				'Use only letters, numbers, hyphens, and underscores.'
			);
			cy.dataTest('remote-sidebar:submit').should(
				'have.attr',
				'disabled'
			);
		});

		it('rejects the name of an existing remote in any case', () => {
			typeInto('remote-sidebar:name', 'My-Remote');

			cy.dataTest('remote-sidebar:name-error').should(
				'have.text',
				'A remote with this name already exists.'
			);
		});

		it('only accepts http and https URLs', () => {
			typeInto('remote-sidebar:url', 'ftp://example.com/conan');

			cy.dataTest('remote-sidebar:url-error').should(
				'have.text',
				'Enter a valid http or https URL.'
			);
		});

		it('clears an error once the field is fixed', () => {
			typeInto('remote-sidebar:name', 'my.remote');
			cy.dataTest('remote-sidebar:name-error').should('exist');

			cy.dataTest('remote-sidebar:name-control-input')
				.shadow()
				.find('input')
				.clear()
				.type('my_remote-2');
			typeInto('remote-sidebar:url', 'http://localhost:9300');

			cy.dataTest('remote-sidebar:name-error').should('not.exist');
			cy.dataTest('remote-sidebar:url-error').should('not.exist');
			cy.dataTest('remote-sidebar:submit').click();
			shouldHaveRequested(pm, addRemoteRequest.method, 1);
		});
	});

	describe('editing', () => {
		beforeEach(() => {
			mountPackageManagerComponent(<RemotesView isActive />);
			cy.dataTest('remotes:list').should('exist');
		});

		it('logs in to a custom remote', () => {
			cy.dataTest('remote-card:my-remote:configure').click();
			selectAuth('Username / Password');
			typeInto('remote-sidebar:username', 'jane');
			typeInto('remote-sidebar:password', 's3cret');
			cy.dataTest('remote-sidebar:submit').click();

			cy.dataTest('remote-card:my-remote:auth').should(
				'have.text',
				'Username / Password'
			);
			sidebarShouldBeOpen(false);
			cy.then(() => {
				expect(
					pm.lastCall(setRemoteCredentialsRequest.method)
				).to.deep.equal({
					name: 'my-remote',
					credentials: {
						auth: 'usernamePassword',
						username: 'jane',
						password: 's3cret'
					}
				});
			});
		});

		it('logs out of a custom remote', () => {
			cy.dataTest('remote-card:private-remote:configure').click();
			selectAuth('No Authentication');
			cy.dataTest('remote-sidebar:submit').click();

			cy.dataTest('remote-card:private-remote:auth').should(
				'have.text',
				'No Auth'
			);
			cy.then(() => {
				expect(
					pm.lastCall(setRemoteCredentialsRequest.method)
				).to.deep.equal({
					name: 'private-remote',
					credentials: {auth: 'none'}
				});
			});
		});

		it('keeps the stored credentials when nothing changes', () => {
			cy.dataTest('remote-card:private-remote:configure').click();
			cy.dataTest('remote-sidebar:submit').click();

			sidebarShouldBeOpen(false);
			shouldHaveRequested(pm, setRemoteCredentialsRequest.method, 0);
		});

		it('only offers to keep the password for the same username', () => {
			cy.dataTest('remote-card:private-remote:configure').click();
			cy.dataTest('remote-sidebar:password-control-input').should(
				'have.attr',
				'placeholder',
				'Leave empty to keep current password'
			);

			typeInto('remote-sidebar:username', '2');

			cy.dataTest('remote-sidebar:password-control-input').should(
				'have.attr',
				'placeholder',
				'Set password'
			);
		});

		it('closes the form when the remote is removed elsewhere', () => {
			cy.dataTest('remote-card:my-remote:configure').click();
			sidebarShouldBeOpen(true);

			cy.then(() => {
				pm.state.remotes = pm.state.remotes.filter(
					remote => remote.name !== 'my-remote'
				);
				sendMockMessage(packageManagerRemotesUpdatedType.method);
			});

			cy.dataTest('remote-card:my-remote').should('not.exist');
			sidebarShouldBeOpen(false);
		});

		it('closes the form when the remote is disabled', () => {
			cy.dataTest('remote-card:my-remote:configure').click();
			sidebarShouldBeOpen(true);

			cy.dataTest('remote-card:my-remote:toggle-span').click();

			sidebarShouldBeOpen(false);
		});

		it('closes the form when the remote is disabled elsewhere', () => {
			cy.dataTest('remote-card:my-remote:configure').click();
			sidebarShouldBeOpen(true);

			cy.then(() => {
				const remote = pm.state.remotes.find(
					candidate => candidate.name === 'my-remote'
				);

				if (remote) {
					remote.disabled = true;
				}

				sendMockMessage(packageManagerRemotesUpdatedType.method);
			});

			toggleOf('my-remote').should(
				'have.attr',
				'aria-label',
				'Enable remote'
			);
			sidebarShouldBeOpen(false);
		});

		it('closes the form when a store reset clears the remotes', () => {
			cy.dataTest('remote-card:my-remote:configure').click();
			sidebarShouldBeOpen(true);

			cy.then(() => {
				store.dispatch(resetStore({}));
			});

			// It stays closed once the remote is listed again.
			shouldHaveRequested(pm, getRemotesRequest.method, 2);
			cy.dataTest('remote-card:my-remote').should('exist');
			sidebarShouldBeOpen(false);
		});
	});

	describe('errors', () => {
		/** Makes the backend report `error` for a remote from now on. */
		const reportError = (
			name: string,
			error: PackageManagerRemote['error']
		) => {
			const remote = pm.state.remotes.find(
				candidate => candidate.name === name
			);

			if (remote) {
				remote.error = error;
			}
		};

		it('shows what keeps a remote from working on its card', () => {
			reportError('my-remote', {
				kind: 'fetch',
				message: 'Unable to connect to remote my-remote'
			});
			reportError('private-remote', {
				kind: 'auth',
				message: "Authentication error on remote 'private-remote'"
			});
			reportError('cfs-restricted', {
				kind: 'config',
				message: 'failed to configure remote'
			});
			mountPackageManagerComponent(<RemotesView isActive />);

			cy.dataTest('remote-card:my-remote:error')
				.should(
					'have.text',
					"Couldn't load packages from this remote."
				)
				.and(
					'have.attr',
					'title',
					'Unable to connect to remote my-remote'
				);
			cy.dataTest('remote-card:private-remote:error').should(
				'have.text',
				'Authentication with this remote failed.'
			);
			cy.dataTest('remote-card:cfs-restricted:error').should(
				'have.text',
				"Couldn't set up this remote."
			);
			// Checked last, once the cards are known to be on screen.
			cy.dataTest('remote-card:old-remote:error').should('not.exist');
		});

		it('clears the error once the remote works again', () => {
			reportError('my-remote', {
				kind: 'fetch',
				message: 'Unable to connect to remote my-remote'
			});
			mountPackageManagerComponent(<RemotesView isActive />);
			cy.dataTest('remote-card:my-remote:error').should('exist');

			cy.then(() => {
				reportError('my-remote', undefined);
				sendMockMessage(packageManagerRemotesUpdatedType.method);
			});

			cy.dataTest('remote-card:my-remote:error').should('not.exist');
			cy.dataTest('remote-card:my-remote').should('exist');
		});
	});

	describe('toggling', () => {
		beforeEach(() => {
			mountPackageManagerComponent(<RemotesView isActive />);
			cy.dataTest('remotes:list').should('exist');
		});

		it('shows the new state at once and locks the card until it is applied', () => {
			pm.hold(setRemoteEnabledRequest.method);
			toggleOf('my-remote')
				.should('be.checked')
				.and('have.attr', 'aria-label', 'Disable remote');

			cy.dataTest('remote-card:my-remote:toggle-span').click();

			toggleOf('my-remote')
				.should('not.be.checked')
				.and('have.attr', 'aria-label', 'Updating...');
			cy.dataTest('remote-card:my-remote:delete').should(
				'have.attr',
				'disabled'
			);

			cy.then(() => {
				pm.flush(setRemoteEnabledRequest.method);
			});

			toggleOf('my-remote').should(
				'have.attr',
				'aria-label',
				'Enable remote'
			);
			cy.dataTest('remote-card:my-remote:delete').should(
				'not.have.attr',
				'disabled'
			);
			// Disabled remotes can't be configured.
			cy.dataTest('remote-card:my-remote:configure').should(
				'have.attr',
				'disabled'
			);
			cy.then(() => {
				expect(
					pm.lastCall(setRemoteEnabledRequest.method)
				).to.deep.equal({name: 'my-remote', enabled: false});
				expect(findRemote('my-remote')?.disabled).to.equal(true);
			});
		});

		it('only locks the remote being toggled', () => {
			pm.hold(setRemoteEnabledRequest.method);
			cy.dataTest('remote-card:my-remote:toggle-span').click();
			cy.dataTest('remote-card:my-remote:delete').should(
				'have.attr',
				'disabled'
			);

			// The package manager applies one change at a time, so the other
			// remotes can be changed meanwhile.
			cy.dataTest('remote-card:private-remote:toggle-span').click();
			shouldHaveRequested(pm, setRemoteEnabledRequest.method, 2);
			cy.dataTest('remote-card:private-remote:delete').should(
				'have.attr',
				'disabled'
			);
			cy.dataTest('remote-card:old-remote:delete').should(
				'not.have.attr',
				'disabled'
			);
			cy.dataTest('remotes:add').click();
			cy.dataTest('remote-sidebar:submit').should(
				'not.have.attr',
				'disabled'
			);

			cy.then(() => {
				pm.flush(setRemoteEnabledRequest.method);
			});

			cy.dataTest('remote-card:my-remote:delete').should(
				'not.have.attr',
				'disabled'
			);
			cy.dataTest('remote-card:private-remote:delete').should(
				'not.have.attr',
				'disabled'
			);
			toggleOf('my-remote').should('not.be.checked');
			toggleOf('private-remote').should('not.be.checked');
		});

		it('keeps showing a toggle in flight when an older list arrives', () => {
			pm.hold(setRemoteEnabledRequest.method);
			cy.dataTest('remote-card:my-remote:toggle-span').click();
			toggleOf('my-remote').should('not.be.checked');

			cy.then(() => {
				// A list read before the change was applied.
				const remote = pm.state.remotes.find(
					candidate => candidate.name === 'my-remote'
				);

				if (remote) {
					remote.disabled = false;
				}

				sendMockMessage(packageManagerRemotesUpdatedType.method);
			});

			shouldHaveRequested(pm, getRemotesRequest.method, 2);
			// Wait until the older list has been applied.
			cy.wrap(store).should(current => {
				expect(current.getState().remotesReducer.listRequestId).to.be
					.undefined;
			});
			toggleOf('my-remote').should('not.be.checked');
			cy.dataTest('remote-card:my-remote:delete').should(
				'have.attr',
				'disabled'
			);

			cy.then(() => {
				pm.flush(setRemoteEnabledRequest.method);
			});

			cy.dataTest('remote-card:my-remote:delete').should(
				'not.have.attr',
				'disabled'
			);
			toggleOf('my-remote').should('not.be.checked');
		});

		it('reverts the toggle when the change fails', () => {
			pm.fail(setRemoteEnabledRequest.method, 'conan failed');

			cy.dataTest('remote-card:my-remote:toggle-span').click();

			shouldHaveRequested(pm, setRemoteEnabledRequest.method, 1);
			toggleOf('my-remote').should(
				'have.attr',
				'aria-label',
				'Disable remote'
			);
			cy.then(() => {
				expect(findRemote('my-remote')?.disabled).to.equal(false);
			});
		});

		it('shows the state the package manager reports when a change fails', () => {
			pm.fail(setRemoteEnabledRequest.method, 'conan failed');

			cy.then(() => {
				// The new state was saved, but applying it failed.
				const remote = pm.state.remotes.find(
					candidate => candidate.name === 'my-remote'
				);

				if (remote) {
					remote.disabled = true;
				}
			});

			cy.dataTest('remote-card:my-remote:toggle-span').click();

			shouldHaveRequested(pm, getRemotesRequest.method, 2);
			// Wait until the list read after the failure has been applied.
			cy.wrap(store).should(current => {
				expect(current.getState().remotesReducer.listRequestId).to.be
					.undefined;
			});
			toggleOf('my-remote').should(
				'have.attr',
				'aria-label',
				'Enable remote'
			);
		});

		it('shows no authentication for a disabled custom remote', () => {
			// The extension doesn't report credentials for those.
			cy.dataTest('remote-card:old-remote').should('exist');
			cy.dataTest('remote-card:old-remote:auth').should('not.exist');
			cy.dataTest('remote-card:old-remote:configure').should(
				'have.attr',
				'disabled'
			);
		});
	});

	describe('when a change is applied but the list cannot be read back', () => {
		beforeEach(() => {
			// The extension resolves with no list in that case.
			pm = mockPackageManager(
				{remotes: seedRemotes()},
				{
					[setRemoteEnabledRequest.method]: () => undefined,
					[addRemoteRequest.method]: () => undefined
				}
			);
			mountPackageManagerComponent(<RemotesView isActive />);
			cy.dataTest('remotes:list').should('exist');
			// Nor can it be read again right away.
			cy.then(() => {
				pm.fail(getRemotesRequest.method, 'conan failed');
			});
		});

		it('keeps the new toggle state', () => {
			pm.hold(setRemoteEnabledRequest.method);
			cy.dataTest('remote-card:my-remote:toggle-span').click();
			cy.dataTest('remote-card:my-remote:delete').should(
				'have.attr',
				'disabled'
			);

			cy.then(() => {
				pm.flush(setRemoteEnabledRequest.method);
			});

			// The list is read again, which fails too.
			shouldHaveRequested(pm, getRemotesRequest.method, 2);
			cy.dataTest('remote-card:my-remote:delete').should(
				'not.have.attr',
				'disabled'
			);
			toggleOf('my-remote').should(
				'have.attr',
				'aria-label',
				'Enable remote'
			);
			cy.then(() => {
				expect(findRemote('my-remote')?.disabled).to.equal(true);
			});
		});

		it('drops a list read before the change', () => {
			pm.recover(getRemotesRequest.method);
			pm.hold(getRemotesRequest.method);

			cy.then(() => {
				// Read before the change, so the remote is still enabled in it.
				sendMockMessage(packageManagerRemotesUpdatedType.method);
			});
			shouldHaveRequested(pm, getRemotesRequest.method, 2);

			cy.then(() => {
				// Applied, but not reported back.
				const remote = pm.state.remotes.find(
					candidate => candidate.name === 'my-remote'
				);

				if (remote) {
					remote.disabled = true;
				}
			});
			cy.dataTest('remote-card:my-remote:toggle-span').click();
			shouldHaveRequested(pm, getRemotesRequest.method, 3);

			cy.then(() => {
				pm.flush(getRemotesRequest.method);
			});

			cy.wrap(store).should(current => {
				expect(current.getState().remotesReducer.listRequestId).to.be
					.undefined;
			});
			toggleOf('my-remote').should(
				'have.attr',
				'aria-label',
				'Enable remote'
			);
		});

		it('only lets an enabled remote be configured once its authentication is known', () => {
			cy.dataTest('remote-card:old-remote:toggle-span').click();

			toggleOf('old-remote').should(
				'have.attr',
				'aria-label',
				'Disable remote'
			);
			cy.dataTest('remote-card:old-remote:delete').should(
				'not.have.attr',
				'disabled'
			);
			// Configuring it now would offer "No Authentication" for a remote
			// that may have credentials.
			cy.dataTest('remote-card:old-remote:configure').should(
				'have.attr',
				'disabled'
			);

			cy.then(() => {
				const remote = pm.state.remotes.find(
					candidate => candidate.name === 'old-remote'
				);

				if (remote) {
					remote.disabled = false;
				}

				pm.recover(getRemotesRequest.method);
				sendMockMessage(packageManagerRemotesUpdatedType.method);
			});

			cy.dataTest('remote-card:old-remote:auth').should(
				'have.text',
				'Username / Password'
			);
			cy.dataTest('remote-card:old-remote:configure').should(
				'not.have.attr',
				'disabled'
			);
		});

		it('closes the form once the remote is added', () => {
			pm.hold(addRemoteRequest.method);
			cy.dataTest('remotes:add').click();
			typeInto('remote-sidebar:name', 'new-remote');
			typeInto('remote-sidebar:url', 'https://example.com/conan');
			cy.dataTest('remote-sidebar:submit').click();
			sidebarShouldBeOpen(true);

			cy.then(() => {
				pm.flush(addRemoteRequest.method);
			});

			sidebarShouldBeOpen(false);
		});
	});

	it('offers no configure or delete actions on built-in remotes', () => {
		mountPackageManagerComponent(<RemotesView isActive />);

		cy.dataTest('remote-card:cfs-public').should('exist');
		cy.dataTest('remote-card:cfs-public:configure').should(
			'not.exist'
		);
		cy.dataTest('remote-card:cfs-public:delete').should('not.exist');
	});

	it('removes a custom remote only once the removal is confirmed', () => {
		mountPackageManagerComponent(<RemotesView isActive />);

		cy.dataTest('remote-card:my-remote:delete').click();
		cy.contains('Remove my-remote?').should('be.visible');
		cy.dataTest('remove-remote-modal')
			.find('vscode-button[aria-label="Close"]')
			.should('be.visible');
		cy.dataTest('remove-remote-modal:cancel').click();

		cy.dataTest('remote-card:my-remote').should('exist');
		shouldHaveRequested(pm, removeRemoteRequest.method, 0);

		cy.dataTest('remote-card:my-remote:delete').click();
		cy.dataTest('remove-remote-modal:confirm').click();

		cy.dataTest('remote-card:my-remote').should('not.exist');
		cy.then(() => {
			expect(pm.lastCall(removeRemoteRequest.method)).to.deep.equal({
				name: 'my-remote'
			});
		});
	});

	describe('refreshing', () => {
		beforeEach(() => {
			mountPackageManagerComponent(<RemotesView isActive />);
			cy.dataTest('remote-card:my-remote').should('exist');
		});

		it('reloads the remotes when the extension reports a change', () => {
			cy.then(() => {
				pm.state.remotes.push({
					name: 'cli-remote',
					url: 'https://example.com/cli/',
					disabled: false,
					custom: true,
					auth: 'none'
				});
				sendMockMessage(packageManagerRemotesUpdatedType.method);
			});

			cy.dataTest('remote-card:cli-remote').should('exist');
			cy.dataTest('remote-card:my-remote').should('exist');
		});

		it('takes the remotes sent with a change instead of reloading them', () => {
			cy.then(() => {
				sendMockMessage(packageManagerRemotesUpdatedType.method, {
					remotes: [
						...seedRemotes(),
						{
							name: 'sent-remote',
							url: 'https://example.com/sent/',
							disabled: false,
							custom: true,
							auth: 'none'
						}
					]
				});
			});

			cy.dataTest('remote-card:sent-remote').should('exist');
			shouldHaveRequested(pm, getRemotesRequest.method, 1);
		});

		it('reloads the remotes once a store reset has cleared them', () => {
			cy.then(() => {
				pm.state.remotes = pm.state.remotes.filter(
					remote => remote.name !== 'my-remote'
				);
				store.dispatch(resetStore({}));
			});

			cy.dataTest('remote-card:private-remote').should('exist');
			cy.dataTest('remote-card:my-remote').should('not.exist');
			shouldHaveRequested(pm, getRemotesRequest.method, 2);
		});

		it('keeps a toggle in flight locked and shown across a store reset', () => {
			pm.hold(setRemoteEnabledRequest.method);
			cy.dataTest('remote-card:my-remote:toggle-span').click();
			cy.dataTest('remote-card:my-remote:delete').should(
				'have.attr',
				'disabled'
			);

			cy.then(() => {
				// The reloaded list predates the change.
				const remote = pm.state.remotes.find(
					candidate => candidate.name === 'my-remote'
				);

				if (remote) {
					remote.disabled = false;
				}

				store.dispatch(resetStore({}));
			});

			shouldHaveRequested(pm, getRemotesRequest.method, 2);
			cy.dataTest('remote-card:my-remote:delete').should(
				'have.attr',
				'disabled'
			);
			toggleOf('my-remote').should('not.be.checked');

			cy.then(() => {
				pm.flush(setRemoteEnabledRequest.method);
			});

			cy.dataTest('remote-card:my-remote:delete').should(
				'not.have.attr',
				'disabled'
			);
			toggleOf('my-remote').should('not.be.checked');
		});
	});

	describe('indexing custom remotes', () => {
		const indexing = (remotes: string[]) => {
			sendMockMessage(customRemoteIndexingType.method, {remotes});
		};

		afterEach(() => {
			// Indexing state survives store resets, like the real extension's
			store.dispatch(remoteIndexingChanged({remotes: []}));
		});

		it('locks the remotes until indexing ends', () => {
			mountPackageManagerComponent(<RemotesView isActive />);
			cy.dataTest('remote-card:my-remote').should('exist');
			cy.then(() => {
				indexing(['my-remote']);
			});

			cy.dataTest('remotes:add').should('have.attr', 'disabled');
			// The banner is gone, so the tooltip says why
			cy.dataTest('remotes:add-tooltip').trigger('mouseover');
			cy.contains(
				'Disabled until indexing of my-remote finishes.'
			).should('exist');
			cy.dataTest('remote-card:my-remote:delete').should(
				'have.attr',
				'disabled'
			);
			cy.dataTest('remote-card:my-remote:toggle-span').click();
			shouldHaveRequested(pm, setRemoteEnabledRequest.method, 0);

			cy.then(() => {
				indexing([]);
			});
			cy.dataTest('remotes:add').should('not.have.attr', 'disabled');
			cy.dataTest('remote-card:my-remote:delete').should(
				'not.have.attr',
				'disabled'
			);
		});

		it('locks a side panel opened before indexing started', () => {
			mountPackageManagerComponent(<RemotesView isActive />);
			cy.dataTest('remotes:add').click();
			cy.dataTest('remote-sidebar:submit').should('exist');

			cy.then(() => {
				indexing(['my-remote']);
			});
			cy.dataTest('remote-sidebar:submit').should(
				'have.attr',
				'disabled'
			);
		});

		it('locks a removal confirmed after indexing started', () => {
			mountPackageManagerComponent(<RemotesView isActive />);
			cy.dataTest('remote-card:my-remote:delete').click();
			cy.dataTest('remove-remote-modal:confirm').should(
				'not.have.attr',
				'disabled'
			);

			cy.then(() => {
				indexing(['my-remote']);
			});
			cy.dataTest('remove-remote-modal:confirm').should(
				'have.attr',
				'disabled'
			);
		});
	});
});
