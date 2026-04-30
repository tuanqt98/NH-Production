/**
 * Removes Vietnamese accents from a string
 */
export function removeAccents(str: string): string {
    const accentsMap: { [key: string]: string } = {
        'a': 'áàảãạăắằẳẵặâấầẩẫậ',
        'A': 'ÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬ',
        'e': 'éèẻẽẹêếềểễệ',
        'E': 'ÉÈẺẼẸÊẾỀỂỄỆ',
        'i': 'íìỉĩị',
        'I': 'ÍÌỈĨỊ',
        'o': 'óòỏõọôốồổỗộơớờởỡợ',
        'O': 'ÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢ',
        'u': 'úùủũụưứừửữự',
        'U': 'ÚÙỦŨỤƯỨỪỬỮỰ',
        'y': 'ýỳỷỹỵ',
        'Y': 'ÝỲỶĨỴ',
        'd': 'đ',
        'D': 'Đ'
    };

    for (const [replacement, characters] of Object.entries(accentsMap)) {
        const regex = new RegExp(`[${characters}]`, 'g');
        str = str.replace(regex, replacement);
    }

    return str;
}

/**
 * Standardizes a full name and returns parts
 */
export function getFullNameParts(fullName: string) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 0) return { firstName: '', initials: '' };

    // TuanNQ -> Tuan is the last word
    const firstName = removeAccents(parts[parts.length - 1]);

    // NQ -> N is first word init, Q is second word init...
    // Except the last word (first name)
    const initials = parts.slice(0, parts.length - 1)
        .map(part => removeAccents(part.charAt(0).toUpperCase()))
        .join('');

    return { firstName, initials };
}
