import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
    // mobile/scripts is Expo's scaffolding utility (console-driven CLI).
    { ignores: ['dist', 'docs', 'mobile/scripts', 'mobile/.expo', 'mobile/dist'] },
    {
        files: ['**/*.{js,jsx}'],
        languageOptions: {
            ecmaVersion: 2024,
            globals: { ...globals.browser, ...globals.node },
            parserOptions: { ecmaFeatures: { jsx: true }, sourceType: 'module' },
        },
        plugins: {
            react,
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            // Without this, every component used only in JSX is reported as
            // an unused variable (hundreds of false positives).
            'react/jsx-uses-vars': 'error',
            'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            'no-console': ['warn', { allow: ['warn', 'error'] }],
        },
    },
    {
        // React Native uses Metro's Fast Refresh, not Vite's — provider files
        // exporting a hook next to the component are fine there.
        files: ['mobile/**/*.{js,jsx}'],
        rules: { 'react-refresh/only-export-components': 'off' },
    },
    {
        // Context files export the provider and its hook together (standard
        // React pattern); appConstants exports icon/constant helpers used in
        // JSX. Editing them costs a full reload instead of HMR — accepted.
        files: ['src/context/**/*.jsx', 'src/lib/appConstants.jsx'],
        rules: { 'react-refresh/only-export-components': 'off' },
    },
];
