import { createBehavior, createResource } from '@pind/designable-core';
import { DnFC } from '@pind/designable-react';
import { Slider as AntdSlider } from 'antd';
import React from 'react';
import { AllLocales } from '../../locales';
import { AllSchemas } from '../../schemas';
import { createFieldSchema } from '../Field';

export const Slider: DnFC<React.ComponentProps<typeof AntdSlider>> = AntdSlider;

Slider.Behavior = createBehavior({
  name: 'Slider',
  extends: ['Field'],
  selector: (node) => node.props['x-component'] === 'Slider',
  designerProps: {
    propsSchema: createFieldSchema(AllSchemas.Slider),
  },
  designerLocales: AllLocales.Slider,
});

Slider.Resource = createResource('Inputs', {
  icon: 'SliderSource',
  elements: [
    {
      componentName: 'Field',
      props: {
        type: 'number',
        title: 'Slider',
        'x-decorator': 'FormItem',
        'x-component': 'Slider',
      },
    },
  ],
});
