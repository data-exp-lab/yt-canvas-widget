import {
  DOMWidgetModel,
  ISerializers,
  unpack_models
} from '@jupyter-widgets/base';
import { MODULE_NAME, MODULE_VERSION } from './version';
import { VariableMeshModel } from './variable_mesh';
import { yt_tools, FixedResolutionBuffer } from './utils';

export interface IFRBViewBounds {
  x_low: number;
  x_high: number;
  y_low: number;
  y_high: number;
}

export class FRBModel extends DOMWidgetModel {
  defaults(): any {
    return {
      ...super.defaults(),
      _model_name: FRBModel.model_name,
      _model_module: FRBModel.model_module,
      _model_module_version: FRBModel.model_module_version,
      image_data: null,
      width: 512,
      height: 512,
      view_center: [0.5, 0.5],
      view_width: [1.0, 1.0],
      frb: null,
      variable_mesh_model: null
    };
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  initialize(attributes: any, options: any): void {
    super.initialize(attributes, options);
    this.on_some_change(['width', 'height'], this.sizeChanged, this);
    this.sizeChanged();
  }

  static serializers: ISerializers = {
    ...DOMWidgetModel.serializers,
    variable_mesh_model: { deserialize: unpack_models }
  };

  sizeChanged(): void {
    this.width = this.get('width');
    this.height = this.get('height');
    this.data_buffer = new Float64Array(this.width * this.height);
  }

  calculateViewBounds(): IFRBViewBounds {
    this.view_width = this.get('view_width');
    this.view_center = this.get('view_center');
    const hwidths: [number, number] = [
      this.view_width[0] / 2,
      this.view_width[1] / 2
    ];
    const bounds = <IFRBViewBounds>{
      x_low: this.view_center[0] - hwidths[0],
      x_high: this.view_center[0] + hwidths[0],
      y_low: this.view_center[1] - hwidths[1],
      y_high: this.view_center[1] + hwidths[1]
    };
    return bounds;
  }

  async depositDataBuffer(
    variable_mesh_model: VariableMeshModel,
    current_field: string
  ): Promise<Float64Array> {
    const bounds: IFRBViewBounds = this.calculateViewBounds();
    this.frb = new yt_tools.FixedResolutionBuffer(
      this.width,
      this.height,
      bounds.x_low,
      bounds.x_high,
      bounds.y_low,
      bounds.y_high
    );
    this.frb.deposit(
      variable_mesh_model.variable_mesh,
      this.data_buffer,
      current_field
    );
    return this.data_buffer;
  }

  frb: FixedResolutionBuffer;
  variable_mesh_model: VariableMeshModel;
  data_buffer: Float64Array;
  width: number;
  height: number;
  view_center: [number, number];
  view_width: [number, number];

  static model_name = 'FRBModel';
  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;
}
