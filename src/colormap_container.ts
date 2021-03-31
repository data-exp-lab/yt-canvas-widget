import { WidgetModel } from '@jupyter-widgets/base';
import { MODULE_NAME, MODULE_VERSION } from './version';
import { yt_tools, ColormapCollection } from './utils';

export class ColormapContainerModel extends WidgetModel {
  defaults(): any {
    return {
      ...super.defaults(),
      colormap_values: {},
      _initialized: false,
      _model_name: ColormapContainerModel.model_name,
      _model_module: ColormapContainerModel.model_module,
      _model_module_version: ColormapContainerModel.model_module_version
    };
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  initialize(attributes: any, options: any): void {
    super.initialize(attributes, options);
    this.colormap_values = this.get('colormap_values');
  }

  async normalize(
    colormap_name: string,
    data_array: Float64Array,
    output_array: Uint8ClampedArray,
    min_val: number,
    max_val: number,
    take_log: boolean
  ): Promise<void> {
    if (!this._initialized) {
      await this.setupColormaps();
    }
    const unclamped: Uint8Array = new Uint8Array(output_array.buffer);
    this.colormaps.normalize(
      colormap_name,
      data_array,
      unclamped,
      min_val,
      max_val,
      take_log
    );
  }

  private async setupColormaps(): Promise<void> {
    if (this._initialized) {
      return;
    }
    this.colormaps = new yt_tools.ColormapCollection();
    for (const [name, values] of Object.entries(this.colormap_values)) {
      const arr_values: Uint8Array = Uint8Array.from(values);
      this.colormaps.add_colormap(name, arr_values);
    }
    this._initialized = true;
  }

  colormap_values: unknown;
  colormaps: ColormapCollection;
  _initialized: boolean;
  static model_name = 'ColormapContainerModel';
  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;
}
