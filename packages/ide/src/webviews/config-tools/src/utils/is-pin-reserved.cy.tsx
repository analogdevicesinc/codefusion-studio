import type {Soc} from '../../../common/types/soc';
import {isPinReserved} from './is-pin-reserved';
import {sysPlannerDataInit} from './sys-planner-data-init';

const wlp = (await import('@socs/max32690-wlp.json'))
	.default as unknown as Soc;

function TestComponent({pinId}: {readonly pinId: string}) {
	const isReserved = isPinReserved(pinId);
	let resultText;

	if (isReserved) {
		resultText = 'RESERVED PIN';
	} else {
		resultText = 'NON-RESERVED PIN';
	}

	return <div data-test='result'>{resultText}</div>;
}

describe('Is Pin Reserved utility fn', () => {
	before(() => {
		sysPlannerDataInit(wlp);
	});

	it('Should evaluate signal with PinMuxConfig as non-reserved', () => {
		cy.mount(<TestComponent pinId='E8' />);

		cy.dataTest('result').should('have.text', 'NON-RESERVED PIN');
	});

	it('Should evaluate signal with no PinMuxConfig as reserved', () => {
		cy.mount(<TestComponent pinId='K11' />);

		cy.dataTest('result').should('have.text', 'RESERVED PIN');
	});
});
