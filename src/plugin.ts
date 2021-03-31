import {
  JupyterFrontEndPlugin,
  JupyterFrontEnd
} from '@jupyterlab/application';

import { IJupyterWidgetRegistry } from '@jupyter-widgets/base';

import {
  ColormapContainerModel,
  FRBModel,
  VariableMeshModel,
  WidgytsCanvasModel,
  WidgytsCanvasView,
  FieldArrayModel
} from './widgyts';

import { MODULE_NAME, MODULE_VERSION } from './version';
const EXTENSION_ID = MODULE_NAME + ':plugin';

const widgytsPlugin: JupyterFrontEndPlugin<void> = {
  id: EXTENSION_ID,
  requires: [IJupyterWidgetRegistry],
  activate: (app: JupyterFrontEnd, registry: IJupyterWidgetRegistry): void => {
    registry.registerWidget({
      name: MODULE_NAME,
      version: MODULE_VERSION,
      exports: {
        ColormapContainerModel,
        FRBModel,
        VariableMeshModel,
        WidgytsCanvasModel,
        WidgytsCanvasView,
        FieldArrayModel
      }
    });
  },
  autoStart: true
};

export default widgytsPlugin;
