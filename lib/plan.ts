import 'colors';
import fetch from 'node-fetch';
import { Proposal, Document, DocumentType, Attribute, getApiPathForType } from './proposal.js';

export enum ChangeType {
    None = 'none',
    New = 'new',
    IgnoredNew = 'ignored_new',
    Removed = 'removed',
    Updated = 'updated',
}

export interface Change {
    property: string,
    oldValue: string,
    newValue: string,
    type: ChangeType
}

export interface Plan {
    proposal: Proposal,
    reason: string,
    type: ChangeType
    changes: Array<Change>
}

async function fetchDocument(baseUrl: string, id: string, type: DocumentType, docCache: Map<string, Document>): Promise<Document> {
    let document = docCache.get(id);
    if (document === undefined) {
        const response = await fetch(`${baseUrl}/doc-api/v1/docs/${getApiPathForType(type)}/${id}`);
        if (response.status === 404) {
            document = null;
        } else if (response.ok) {
            document = await response.json();
        } else {
            // TODO: How should we handle this error?
            console.error(await response.text());
        }

        // Cache the result
        docCache.set(id, document as Document);
    }

    return new Promise<Document>(resolve => resolve(document));
}

function getAttributeChanges(old: Array<Attribute>, now: Array<Attribute>): Array<Change> {
    interface Info {
        index: number,
        sentiment: string,
        value: string
    }

    const changes: Array<Change> = [];
    const oldMap = new Map<string, Info>();
    const nowMap = new Map<string, Info>();
    old.forEach((attr, index) => {
        oldMap.set(attr.title, {
            index,
            sentiment: attr.sentiment,
            value: attr.value
        });
    });

    now.forEach((attr, index) => {
        nowMap.set(attr.title, {
            index,
            sentiment: attr.sentiment,
            value: attr.value
        });
    });

    for (const [title, nowAttr] of nowMap) {
        const oldAttr = oldMap.get(title);
        if (!oldAttr) {
            // New attribute
            changes.push({
                property: `attributes.${title}`,
                oldValue: '',
                newValue: JSON.stringify(nowAttr),
                type: ChangeType.New
            });
        } else if (oldAttr.index !== nowAttr.index
            || oldAttr.value !== nowAttr.value
            || oldAttr.sentiment !== nowAttr.sentiment) {
            // Changed attribute
            changes.push({
                property: `attributes.${title}`,
                oldValue: JSON.stringify(oldAttr),
                newValue: JSON.stringify(nowAttr),
                type: ChangeType.Updated
            });
        }
    }

    for (const [title, oldAttr] of oldMap) {
        const nowAttr = nowMap.get(title);
        if (!nowAttr) {
            // Removed attribute
            changes.push({
                property: `attributes.${title}`,
                oldValue: `${oldAttr.index}::${oldAttr.value}::${oldAttr.sentiment}`,
                newValue: '',
                type: ChangeType.Removed
            });
        }
    }

    return changes;
}

function getNameChanges(old: Array<string>, now: Array<string>): Array<Change> {
    const changes: Array<Change> = [];
    const oldSet = new Set<string>();
    const nowSet = new Set<string>();
    old.forEach(t => oldSet.add(t));
    now.forEach(t => nowSet.add(t));

    old.forEach(name => {
        if (!nowSet.has(name)) {
            // Removed name
            changes.push({
                property: 'names',
                oldValue: name,
                newValue: '',
                type: ChangeType.Removed
            });
        }
    });

    now.forEach(name => {
        if (!oldSet.has(name)) {
            // New name
            changes.push({
                property: 'names',
                oldValue: '',
                newValue: name,
                type: ChangeType.New
            });
        }
    });

    return changes;
}

function getDocumentChanges(old: Document, now: Document): Array<Change> {
    const changes: Array<Change> = [];
    if (old.title !== now.title) {
        changes.push({
            property: 'title',
            oldValue: old.title,
            newValue: now.title,
            type: ChangeType.Updated
        });
    }

    changes.push(...getNameChanges(old.names, now.names));
    changes.push(...getAttributeChanges(old.attributes, now.attributes));
    return changes;
}

async function createProposalPlan(baseUrl: string, proposal: Proposal, docCache: Map<string, Document>): Promise<Plan> {
    const target = proposal.target;
    const documentType = proposal.document.type;

    let document: Document;
    let parentDocument: Document;
    if (documentType !== DocumentType.Game) {
        // Fetch the parent
        const parent = target.substr(0, target.lastIndexOf('.'));
        let parentType: DocumentType;
        switch (documentType) {
        case DocumentType.Character: parentType = DocumentType.Game; break;
        case DocumentType.Move: parentType = DocumentType.Character; break;
        }

        parentDocument = await fetchDocument(baseUrl, parent, parentType, docCache);

        // Fetch the actual document
        if (parentDocument) {
            document = await fetchDocument(baseUrl, target, documentType, docCache);
        }
    } else {
        document = await fetchDocument(baseUrl, target, documentType, docCache);
    }


    let plan: Plan;
    if (!document && !parentDocument && documentType !== DocumentType.Game) {
        plan = {
            proposal,
            reason: 'This document cannot be applied. The parent does not exist',
            type: ChangeType.IgnoredNew,
            changes: []
        };
    } else if (!document) {
        plan = {
            proposal,
            reason: 'This is a new document',
            type: ChangeType.New,
            changes: []
        };
    } else {
        const changes = getDocumentChanges(document, proposal.document);
        const changed = changes.length > 0;
        plan = {
            proposal,
            reason: changed ? 'Changes detected' : 'No changes detected',
            type: changed ? ChangeType.Updated : ChangeType.None,
            changes
        };
    }

    return new Promise<Plan>(resolve => resolve(plan));
}

function getChangeString(input: string, type: ChangeType) {
    switch (type) {
    case ChangeType.New: return `[+] ${input}`.green;
    case ChangeType.IgnoredNew: return `[+] ${input}`.gray;
    case ChangeType.Updated: return `[~] ${input}`.blue;
    case ChangeType.Removed: return `[-] ${input}`.red;
    }
}

function printPlan(plan: Plan) {
    if (plan.type === ChangeType.None) {
        return;
    }

    let header = getChangeString(plan.proposal.target, plan.type);
    if (plan.type === ChangeType.IgnoredNew) {
        header += ` (${plan.reason})`.gray;
    }

    console.log(header);
    plan.changes.forEach(change => {
        let diff: string;
        switch (change.type) {
        case ChangeType.New: diff = change.newValue; break;
        case ChangeType.Removed: diff = change.oldValue; break;
        case ChangeType.Updated: diff = `${change.oldValue} → ${change.newValue}`; break;
        }

        console.log(`\t${getChangeString(`${change.property}: ${diff}`, change.type)}`);
    });
    console.log();
}

export async function createPlans(baseUrl: string, props: Array<Proposal>, ): Promise<Array<Plan>> {
    console.log('Creating plans...');
    const fetchCache = new Map<string, Document>();
    const plans: Array<Plan> = [];
    for (let i = 0; i < props.length; ++i) {
        const plan = await createProposalPlan(baseUrl, props[i], fetchCache);
        plans.push(plan);
    }

    plans.forEach(p => printPlan(p));
    return new Promise<Array<Plan>>(resolve => resolve(plans));
}
