// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

const noMoneySyntax = {
  selector: 'CallExpression[callee.name=\'parseFloat\']',
  message: 'parseFloat is forbidden in financial paths. Use app/utils/money.ts helpers (toMinorUnits / parseUserAmount).'
}

const noToFixedSyntax = {
  selector: 'CallExpression[callee.property.name=\'toFixed\']',
  message: '.toFixed() is forbidden on money values — it loses precision and round-trips through float. Format via formatCurrency().'
}

const noFloatLiteralSyntax = {
  selector: 'Literal[raw=/^\\d[\\d_]*\\.\\d[\\d_]*$|^\\.\\d[\\d_]*$/]',
  message: 'Float literals are forbidden in financial paths. Store IDR as integer minor units (Rp 1 = 1).'
}

export default withNuxt({
  files: [
    'app/utils/**/*.ts',
    'app/utils/**/*.tsx',
    'app/utils/**/*.js',
    'app/utils/**/*.jsx',
    'app/utils/**/*.vue',
    'app/domain/**/*.ts',
    'app/domain/**/*.tsx',
    'app/domain/**/*.js',
    'app/domain/**/*.jsx',
    'app/domain/**/*.vue',
    'app/composables/**/*.ts',
    'app/composables/**/*.tsx',
    'app/composables/**/*.js',
    'app/composables/**/*.jsx',
    'app/components/**/*.vue',
    'app/pages/**/*.vue'
  ],
  ignores: [
    '**/*.test.ts',
    '**/*.spec.ts'
  ],
  rules: {
    'vue/no-multiple-template-root': 'off',
    'vue/max-attributes-per-line': ['error', { singleline: 3 }],
    'no-restricted-syntax': [
      'error',
      noMoneySyntax,
      noToFixedSyntax,
      noFloatLiteralSyntax
    ]
  }
})
