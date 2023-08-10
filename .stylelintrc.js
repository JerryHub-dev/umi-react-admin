module.exports = {
  extends: require.resolve('@umijs/max/stylelint'),
  // tailwindcss 报错 https://qiita.com/mizozobu/items/9e86b86df79f9988c7b3
  rules: {
    'at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: ['tailwind', 'layer', 'apply'],
      },
    ],
    'function-no-unknown': [
      true,
      {
        ignoreFunctions: ['theme', 'screen'],
      },
    ],
  },
};
