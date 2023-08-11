import { createBehavior, createResource } from '@pind/designable-core';
import { DnFC } from '@pind/designable-react';
import { Rate as AntdRate } from 'antd';
import React from 'react';
import { AllLocales } from '../../locales';
import { AllSchemas } from '../../schemas';
import { createFieldSchema } from '../Field';

export const Rate: DnFC<React.ComponentProps<typeof AntdRate>> = AntdRate;

Rate.Behavior = createBehavior({
  name: 'Rate',
  extends: ['Field'],
  selector: (node) => node.props['x-component'] === 'Rate',
  designerProps: {
    propsSchema: createFieldSchema(AllSchemas.Rate),
  },
  designerLocales: AllLocales.Rate,
});

Rate.Resource = createResource('Inputs', {
  icon: 'RateSource',
  elements: [
    {
      componentName: 'Field',
      props: {
        type: 'number',
        title: 'Rate',
        'x-decorator': 'FormItem',
        'x-component': 'Rate',
      },
    },
  ],
});
