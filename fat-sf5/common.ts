
const IMPORT_NAME = 'fat-sfv';

function sanitizeForId(input: string): string {
    return input
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s.-]/g, '')  // Remove all non-supported chars
        .replace(/\s|\./g, '-')         // Replace all space and dot chars
        .replace(/-+/g, '-');           // Replace sequenced `-` chars
}

function capitalize(input: string): string {
    const regex = /[a-zA-z0-9]+/g;
    let result = input;
    let match: RegExpExecArray;
    while ((match = regex.exec(input)) !== null) {
        const index = match.index;
        result = result.substr(0, index)
            + result.charAt(index).toUpperCase()
            + result.substr(index + 1);
    }

    return result;
}

export { IMPORT_NAME, sanitizeForId, capitalize };
