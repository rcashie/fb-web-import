import * as fs from 'fs';
import * as path from 'path';
import { Proposal } from '../lib/proposal.js'
import { applyPlans, ApiContext } from '../lib/apply.js';
import { buildCharProposals } from './importChars.js';
import { createPlans } from '../lib/plan.js';
import { getGameProposal } from './importGame.js';

async function doImport(data:  Record<string, unknown>, config: ApiContext, shouldApply: boolean) {
    // Create proposals...
    console.log('Creating proposals...');
    const proposals = [getGameProposal()];
    proposals.push(...buildCharProposals('sfv', data))

    // Create the plans
    const sortFunc = (l: Proposal, r:Proposal) => l.target.localeCompare(r.target);
    const plans = await createPlans(config.baseUrl, proposals.sort(sortFunc));

    if (shouldApply) {
        // Apply plans
        await applyPlans(plans, config);
    }
}

let shouldApply = false;
let inputFile: string = null;

const args: string[] = process.argv;
for (let i = 0; i < args.length; ++i) {
    const arg = args[i];
    switch (arg) {
    case '-f':
    case '--file': {
        inputFile = args[++i];
        break;
    }
    case '-a':
    case '--apply': {
        shouldApply = true;
        break;
    }
    }
}

if (!inputFile) {
    console.error('Error: Specify an input file');
    process.exit(1);
}

const configFile = path.resolve(process.cwd(), 'config.json');
const data = JSON.parse(fs.readFileSync(path.resolve(inputFile), { encoding: 'utf-8' }));
const config = JSON.parse(fs.readFileSync(configFile, { encoding: 'utf-8' })) as ApiContext;
doImport(data, config, shouldApply).then(() => console.log('Done'));