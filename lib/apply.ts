import fetch from 'node-fetch';
import { Plan, ChangeType } from './plan.js';
import { getApiPathForType } from './proposal.js';

export interface ApiContext {
    nonce: string,
    token: string,
    baseUrl: string
}

export async function applyPlans(plans: Array<Plan>, apiContext: ApiContext): Promise<void> {
    if (!plans.length) {
        console.log('Nothing to apply');
        return;
    }

    console.log('Applying plans...');
    for (let i = 0; i < plans.length; ++i) {
        const plan = plans[i];
        if (plan.type === ChangeType.IgnoredNew || plan.type === ChangeType.None) {
            continue;
        }

        const document = plan.proposal.document;
        console.log(`Creating proposal for ${plan.proposal.target}`);
        const post = await fetch(
            `${apiContext.baseUrl}/doc-api/v1/props/${getApiPathForType(document.type)}`,
            {
                method: 'POST',
                body: JSON.stringify(plan.proposal),
                headers: {
                    'cookie': `nonce=${apiContext.nonce}; token=${apiContext.token}`,
                    'content-type': 'application/json'
                }
            }
        );

        if (!post.ok) {
            // TODO: what to do here?
            console.error(await post.text());
            continue;
        }

        const value = await post.json();
        console.log(`Approving proposal ${value.proposal}/${value.version}`);
        const patch = await fetch(
            `${apiContext.baseUrl}/doc-api/v1/props/any/${value.proposal}/${value.version}/status/approved`,
            {
                method: 'PATCH',
                headers: {
                    'cookie': `nonce=${apiContext.nonce}; token=${apiContext.token}`
                }
            }
        );

        if (!patch.ok) {
            // TODO: what to do here?
            console.error(await patch.text());
        }
    }

    return new Promise<void>(resolve => resolve());
}
