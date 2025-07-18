/**
 * Global type declarations for cross-environment compatibility
 */

// Window object type for environments where it might not exist
declare const window: Window & typeof globalThis | undefined;

// Document object type for environments where it might not exist  
declare const document: Document | undefined;

// Navigator object type for environments where it might not exist
declare const navigator: Navigator | undefined;

// Export to make this a module
export {};