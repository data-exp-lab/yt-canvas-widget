import {
  DOMWidgetModel,
  ISerializers,
  unpack_models
} from '@jupyter-widgets/base';
import { MODULE_NAME, MODULE_VERSION } from './version';
import { f64Serializer, yt_tools, VariableMesh } from './utils';

/*
 * We have this as we can potentially have more than one FRB for a variable mesh
 *
 */

export class FieldArrayModel extends DOMWidgetModel {
  defaults(): any {
    return {
      ...super.defaults(),
      _model_name: FieldArrayModel.model_name,
      _model_module: FieldArrayModel.model_module,
      _model_module_version: FieldArrayModel.model_module_version,
      field_name: null,
      array: null
    };
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  initialize(attributes: any, options: any): void {
    super.initialize(attributes, options);
    this.field_name = this.get('field_name');
    this.array = this.get('array');
  }

  static serializers: ISerializers = {
    ...DOMWidgetModel.serializers,
    array: f64Serializer
  };

  field_name: string;
  array: Float64Array;
  static model_name = 'FieldArrayModel';
  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;
}

export class VariableMeshModel extends DOMWidgetModel {
  defaults(): any {
    return {
      ...super.defaults(),
      _model_name: VariableMeshModel.model_name,
      _model_module: VariableMeshModel.model_module,
      _model_module_version: VariableMeshModel.model_module_version,
      px: null,
      pdx: null,
      py: null,
      pdy: null,
      field_values: [],
      variable_mesh: undefined
    };
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  initialize(attributes: any, options: any): void {
    super.initialize(attributes, options);
    this.variable_mesh = new yt_tools.VariableMesh(
      this.get('px'),
      this.get('py'),
      this.get('pdx'),
      this.get('pdy')
    );
    this.on('change:field_values', this.updateFieldValues, this);
    this.updateFieldValues();
  }

  updateFieldValues(): void {
    this.field_values = this.get('field_values');
    for (const field of this.field_values) {
      if (!this.variable_mesh.has_field(field.field_name)) {
        this.variable_mesh.add_field(field.field_name, field.array);
      }
    }
  }

  static serializers: ISerializers = {
    ...DOMWidgetModel.serializers,
    px: f64Serializer,
    pdx: f64Serializer,
    py: f64Serializer,
    pdy: f64Serializer,
    field_values: { deserialize: unpack_models }
  };

  px: Float64Array;
  pdx: Float64Array;
  py: Float64Array;
  pdy: Float64Array;
  field_values: Array<FieldArrayModel>;
  variable_mesh: VariableMesh;

  static model_name = 'VariableMeshModel';
  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;
}
