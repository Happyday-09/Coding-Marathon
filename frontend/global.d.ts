import * as React from 'react';

declare module 'react' {
  namespace JSX {
    type Element = React.ReactElement;
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}
