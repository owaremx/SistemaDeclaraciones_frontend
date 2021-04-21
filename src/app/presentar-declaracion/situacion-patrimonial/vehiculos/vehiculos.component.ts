import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { Apollo } from 'apollo-angular';
import { vehiculosMutation, vehiculosQuery } from '@api/declaracion';

import { MatDialog } from '@angular/material/dialog';
import { DialogComponent } from '@shared/dialog/dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';

import TipoVehiculo from '@static/catalogos/tipoVehiculo.json';
import FormaAdquisicion from '@static/catalogos/formaAdquisicion.json';
import TitularBien from '@static/catalogos/titularBien.json';
import FormaPago from '@static/catalogos/formaPago.json';
import ParentescoRelacion from '@static/catalogos/parentescoRelacion.json';
import Extranjero from '@static/catalogos/extranjero.json';
import Estados from '@static/catalogos/estados.json';
import Municipios from '@static/catalogos/municipios.json';
import Paises from '@static/catalogos/paises.json';
import Monedas from '@static/catalogos/monedas.json';

import { tooltipData } from '@static/tooltips/vehiculos';

import { DeclaracionOutput, Vehiculo, Vehiculos } from '@models/declaracion';

import { findOption, ifExistEnableFields } from '@utils/utils';
import { Constantes } from '@app/@shared/constantes';

@Component({
  selector: 'app-vehiculos',
  templateUrl: './vehiculos.component.html',
  styleUrls: ['./vehiculos.component.scss'],
})
export class VehiculosComponent implements OnInit {
  aclaraciones = false;
  vehiculosForm: FormGroup;
  editMode = false;
  editIndex: number = null;
  vehiculo: Vehiculo[] = [];
  isLoading = false;
  currentYear = new Date().getFullYear();

  tipoVehiculoCatalogo = TipoVehiculo;
  formaAdquisicionCatalogo = FormaAdquisicion;
  titularBienCatalogo = TitularBien;
  formaPagoCatalogo = FormaPago;
  parentescoRelacionCatalogo = ParentescoRelacion;
  estadosCatalogo = Estados;
  municipiosCatalogo = Municipios;
  paisesCatalogo = Paises;
  extranjeroCatalogo = Extranjero;
  monedasCatalogo = Monedas;

  tipoDeclaracion: string = null;
  tipoDomicilio: string;

  declaracionId: string = null;

  tooltipData = tooltipData;

  constructor(
    private apollo: Apollo,
    private dialog: MatDialog,
    private formBuilder: FormBuilder,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.tipoDeclaracion = this.router.url.split('/')[1];
    this.createForm();
    this.getUserInfo();
  }

  addItem() {
    //this.vehiculosForm.reset();
    this.createForm();
    this.editMode = true;
    this.editIndex = null;
  }

  locationChanged(value: string) {
    const localizacion = this.vehiculosForm.get('vehiculo').get('lugarRegistro');
    const pais = localizacion.get('pais');
    const entidadFederativa = localizacion.get('entidadFederativa');
    if (value === 'EX') {
      this.tipoDomicilio = 'EXTRANJERO';
      pais.enable();
      entidadFederativa.disable();
      entidadFederativa.reset();
    } else {
      this.tipoDomicilio = 'MEXICO';
      pais.disable();
      entidadFederativa.enable();
      pais.reset();
    }
  }

  cancelEditMode() {
    this.editMode = false;
    this.editIndex = null;
  }

  createForm() {
    this.vehiculosForm = this.formBuilder.group({
      ninguno: [false],
      vehiculo: this.formBuilder.group({
        tipoVehiculo: ['', Validators.required],
        titular: ['', Validators.required],
        transmisor: this.formBuilder.group({
          tipoPersona: ['', [Validators.required]],
          nombreRazonSocial: ['', [Validators.required, Validators.pattern(/^\S.*\S$/)]],
          rfc: [
            '',
            [
              Validators.required,
              Validators.pattern(
                Constantes.VALIDACION_RFC
                // /^([A-ZÑ&]{3,4}) ?(?:- ?)?(\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])) ?(?:- ?)?([A-Z\d]{2})([A\d])$/i
              ),
            ],
          ],
          relacion: ['', Validators.required],
        }),
        marca: ['', [Validators.required, Validators.pattern(/^\S.*\S$/)]],
        modelo: ['', [Validators.required, Validators.pattern(/^\S.*\S$/)]],
        anio: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
        numeroSerieRegistro: ['', [Validators.required, Validators.pattern(/^\S.*\S$/)]],
        tercero: this.formBuilder.group({
          tipoPersona: ['FISICA', [Validators.required]],
          nombreRazonSocial: ['', [Validators.required, Validators.pattern(/^\S.*\S$/)]],
          rfc: [
            '',
            [
              Validators.required,
              Validators.pattern(
                Constantes.VALIDACION_RFC
                ///^([A-ZÑ&]{3,4}) ?(?:- ?)?(\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])) ?(?:- ?)?([A-Z\d]{2})([A\d])$/i
              ),
            ],
          ],
        }),
        lugarRegistro: this.formBuilder.group({
          pais: ['', [Validators.required]],
          entidadFederativa: ['', Validators.required],
        }),
        formaAdquisicion: ['', Validators.required],
        formaPago: ['', [Validators.required]],
        valorAdquisicion: this.formBuilder.group({
          valor: [0, [Validators.required, Validators.pattern(/^\d+\.?\d{0,2}$/), Validators.min(0)]],
          moneda: ['MXN', [Validators.required]],
        }),
        fechaAdquisicion: ['', [Validators.required]],
      }),
      aclaracionesObservaciones: [{ disabled: true, value: '' }, [Validators.required, Validators.pattern(/^\S.*\S$/)]],
    });

    ///////////////////////////// OMAR
    this.vehiculosForm.get('vehiculo.titular').valueChanges.subscribe((val) => {
      if (!val) return;

      const razonSocial = this.vehiculosForm.get('vehiculo.tercero').get('nombreRazonSocial');
      const tipoPersona = this.vehiculosForm.get('vehiculo.tercero').get('tipoPersona');
      const rfc = this.vehiculosForm.get('vehiculo.tercero').get('rfc');

      if (val.clave === 'DEC') {
        razonSocial.clearValidators();
        tipoPersona.clearValidators();
        rfc.clearValidators();

        razonSocial.setValue('');
        rfc.setValue('');
        tipoPersona.setValue('FISICA');
      } else {
        tipoPersona.setValidators([Validators.required]);
        razonSocial.setValidators([Validators.required]);
        rfc.setValidators([Validators.pattern(Constantes.VALIDACION_RFC), Validators.required]);
      }

      razonSocial.updateValueAndValidity();
      rfc.updateValueAndValidity();
      tipoPersona.updateValueAndValidity();
    });
  }

  editItem(index: number) {
    this.setEditMode();
    this.fillForm(this.vehiculo[index]);
    this.editIndex = index;
  }

  fillForm(vehiculo: Vehiculo) {
    Object.keys(vehiculo)
      .filter((field) => vehiculo[field] !== null)
      .forEach((field) => this.vehiculosForm.get(`vehiculo.${field}`).patchValue(vehiculo[field]));
    this.vehiculosForm.get(`vehiculo.tercero`).patchValue(vehiculo.tercero[0]);
    this.vehiculosForm.get(`vehiculo.transmisor`).patchValue(vehiculo.transmisor[0]);

    ifExistEnableFields(
      vehiculo.lugarRegistro.entidadFederativa,
      this.vehiculosForm,
      'vehiculo.lugarRegistro.entidadFederativa'
    );
    if (vehiculo.lugarRegistro.entidadFederativa) {
      this.tipoDomicilio = 'MEXICO';
    }
    ifExistEnableFields(vehiculo.lugarRegistro.pais, this.vehiculosForm, 'vehiculo.lugarRegistro.pais');
    if (vehiculo.lugarRegistro.pais) {
      this.tipoDomicilio = 'EXTRANJERO';
    }

    this.setSelectedOptions();
  }

  async getUserInfo() {
    try {
      const { data } = await this.apollo
        .query<DeclaracionOutput>({
          query: vehiculosQuery,
          variables: {
            tipoDeclaracion: this.tipoDeclaracion.toUpperCase(),
          },
        })
        .toPromise();
      this.declaracionId = data.declaracion._id;
      if (data.declaracion.vehiculos) {
        this.setupForm(data.declaracion.vehiculos);
      }
    } catch (error) {
      console.log(error);
    }
  }

  ngOnInit(): void {}

  noVehicle() {
    this.saveInfo({ ninguno: true });
  }

  openSnackBar(message: string, action: string = null) {
    this.snackBar.open(message, action, {
      duration: 5000,
    });
  }

  presentSuccessAlert() {
    this.dialog.open(DialogComponent, {
      data: {
        title: 'Operación exitosa',
        message: 'Se han guardado tus cambios',
        trueText: 'Aceptar',
      },
    });
  }

  removeItem(index: number) {
    const dialogRef = this.dialog.open(DialogComponent, {
      data: {
        title: 'Eliminar elemento',
        message: '¿Está seguro de eliminar este elemento?',
        trueText: 'Eliminar',
        falseText: 'Cancelar',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const vehiculo = [...this.vehiculo.slice(0, index), ...this.vehiculo.slice(index + 1)];
        const aclaracionesObservaciones = this.vehiculosForm.value.aclaracionesObservaciones;
        this.saveInfo({
          vehiculo,
          aclaracionesObservaciones,
        });
      }
    });
  }

  async saveInfo(form: Vehiculos) {
    try {
      const declaracion = {
        vehiculos: form,
      };

      const { data } = await this.apollo
        .mutate<DeclaracionOutput>({
          mutation: vehiculosMutation,
          variables: {
            id: this.declaracionId,
            declaracion,
          },
        })
        .toPromise();
      this.editMode = false;
      if (data.declaracion.vehiculos) {
        this.setupForm(data.declaracion.vehiculos);
      }
      this.presentSuccessAlert();
    } catch (error) {
      console.log(error);
      this.openSnackBar('ERROR: No se guardaron los cambios', 'Aceptar');
    }
  }

  saveItem() {
    let vehiculo = [...this.vehiculo];
    const aclaracionesObservaciones = this.vehiculosForm.value.aclaracionesObservaciones;
    const newItem = this.vehiculosForm.value.vehiculo;

    if (this.editIndex === null) {
      vehiculo = [...vehiculo, newItem];
    } else {
      vehiculo[this.editIndex] = newItem;
    }

    this.isLoading = true;

    this.saveInfo({
      vehiculo,
      aclaracionesObservaciones,
    });

    this.isLoading = false;
  }

  setEditMode() {
    //this.vehiculosForm.reset();
    this.createForm();
    this.editMode = true;
    this.editIndex = null;
  }

  setSelectedOptions() {
    const { tipoVehiculo, titular, formaAdquisicion } = this.vehiculosForm.value.vehiculo;

    const { relacion } = this.vehiculosForm.value.vehiculo.transmisor;

    if (tipoVehiculo) {
      this.vehiculosForm.get('vehiculo.tipoVehiculo').setValue(findOption(this.tipoVehiculoCatalogo, tipoVehiculo));
    }

    if (titular) {
      this.vehiculosForm.get('vehiculo.titular').setValue(findOption(this.titularBienCatalogo, titular[0]));
    }

    if (relacion) {
      this.vehiculosForm
        .get('vehiculo.transmisor.relacion')
        .setValue(findOption(this.parentescoRelacionCatalogo, relacion));
    }

    if (formaAdquisicion) {
      this.vehiculosForm
        .get('vehiculo.formaAdquisicion')
        .setValue(findOption(this.formaAdquisicionCatalogo, formaAdquisicion));
    }
  }

  setupForm(vehiculos: Vehiculos) {
    this.vehiculo = vehiculos.vehiculo;
    const aclaraciones = vehiculos.aclaracionesObservaciones;

    if (vehiculos.ninguno) {
      this.vehiculosForm.get('ninguno').patchValue(true);
    }

    if (aclaraciones) {
      this.vehiculosForm.get('aclaracionesObservaciones').setValue(aclaraciones);
      this.toggleAclaraciones(true);
    }

    //this.editMode = !!!this.vehiculo.length;
  }

  toggleAclaraciones(value: boolean) {
    const aclaraciones = this.vehiculosForm.get('aclaracionesObservaciones');
    if (value) {
      aclaraciones.enable();
    } else {
      aclaraciones.disable();
      aclaraciones.reset();
    }
    this.aclaraciones = value;
  }
}
