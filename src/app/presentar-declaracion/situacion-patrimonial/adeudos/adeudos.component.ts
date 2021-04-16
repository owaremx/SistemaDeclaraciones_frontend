import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { Apollo } from 'apollo-angular';
import { adeudosPasivosMutation, adeudosPasivosQuery } from '@api/declaracion';

import { MatDialog } from '@angular/material/dialog';
import { DialogComponent } from '@shared/dialog/dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';

import { Adeudo, AdeudosPasivos, DeclaracionOutput, MexicoExtranjero } from '@models/declaracion';

import TipoAdeudo from '@static/catalogos/tipoAdeudo.json';
import FormaAdquisicion from '@static/catalogos/formaAdquisicion.json';
import TitularBien from '@static/catalogos/titularBien.json';
import FormaPago from '@static/catalogos/formaPago.json';
import ParentescoRelacion from '@static/catalogos/parentescoRelacion.json';
import ValorConformeA from '@static/catalogos/valorConformeA.json';
import Extranjero from '@static/catalogos/extranjero.json';
import Paises from '@static/catalogos/paises.json';
import Monedas from '@static/catalogos/monedas.json';

import { tooltipData } from '@static/tooltips/adeudos';

import { findOption } from '@utils/utils';
import { Constantes } from '@app/@shared/constantes';

@Component({
  selector: 'app-adeudos',
  templateUrl: './adeudos.component.html',
  styleUrls: ['./adeudos.component.scss'],
})
export class AdeudosComponent implements OnInit {
  aclaraciones = false;
  adeudosPasivosForm: FormGroup;
  editMode = false;
  editIndex: number = null;
  adeudo: Adeudo[] = [];
  isLoading = false;

  tipoAdeudoCatalogo = TipoAdeudo;
  formaAdquisicionCatalogo = FormaAdquisicion;
  titularBienCatalogo = TitularBien;
  formaPagoCatalogo = FormaPago;
  parentescoRelacionCatalogo = ParentescoRelacion;
  valorConformeACatalogo = ValorConformeA;
  extranjeroCatalogo = Extranjero;
  paisesCatalogo = Paises;
  monedasCatalogo = Monedas;

  tipoDeclaracion: string = null;
  tipoDomicilio: MexicoExtranjero = null;

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
    this.adeudosPasivosForm.reset();
    this.adeudosPasivosForm.get('ninguno').setValue(false);
    this.editMode = true;
    this.editIndex = null;
  }

  localizacionChanged(value: MexicoExtranjero) {
    this.tipoDomicilio = value;
    if (value === 'MX') {
      this.adeudosPasivosForm.get('adeudo.localizacionAdeudo.pais').setValue('MX');
    }
  }

  cancelEditMode() {
    this.editMode = false;
    this.editIndex = null;
  }

  createForm() {
    this.adeudosPasivosForm = this.formBuilder.group({
      ninguno: [false],
      adeudo: this.formBuilder.group({
        titular: [[], Validators.required],
        tipoAdeudo: [{ clave: '', valor: '' }, Validators.required],
        numeroCuentaContrato: ['', [Validators.required, Validators.pattern(/^\S.*\S?$/)]],
        fechaAdquisicion: ['', [Validators.required, Validators.pattern(/^\S.*\S?$/)]],
        montoOriginal: this.formBuilder.group({
          valor: [0, [Validators.required, Validators.pattern(/^\d+\.?\d{0,2}$/)]],
          moneda: ['MXN', [Validators.pattern(/^\S.*\S?$/)]],
        }),
        saldoInsolutoSituacionActual: this.formBuilder.group({
          valor: [0, [Validators.required, Validators.pattern(/^\d+\.?\d{0,2}$/)]],
          moneda: ['MXN', [Validators.pattern(/^\S.*\S?$/)]],
        }),
        tercero: this.formBuilder.group({
          tipoPersona: ['', [Validators.required, Validators.pattern(/^\S.*\S?$/)]],
          nombreRazonSocial: ['', [Validators.required, Validators.pattern(/^\S.*\S?$/)]],
          rfc: ['', [Validators.required, Validators.pattern(Constantes.VALIDACION_RFC)]],
        }),
        otorganteCredito: this.formBuilder.group({
          tipoPersona: ['', [Validators.required, Validators.pattern(/^\S.*\S?$/)]],
          nombreInstitucion: ['', [Validators.required, Validators.pattern(/^\S.*\S?$/)]],
          rfc: ['', [Validators.required, Validators.pattern(Constantes.VALIDACION_RFC)]],
        }),
        localizacionAdeudo: this.formBuilder.group({
          pais: ['MX', [Validators.required]],
        }),
      }),
      aclaracionesObservaciones: [{ disabled: true, value: '' }, [Validators.required, Validators.pattern(/^\S.*\S$/)]],
    });
  }

  editItem(index: number) {
    this.setEditMode();
    this.fillForm(this.adeudo[index]);
    this.editIndex = index;
  }

  fillForm(adeudo: Adeudo) {
    Object.keys(adeudo)
      .filter((field) => adeudo[field] !== null)
      .forEach((field) => this.adeudosPasivosForm.get(`adeudo.${field}`).patchValue(adeudo[field]));
    this.adeudosPasivosForm.get(`adeudo.tercero`).patchValue(adeudo.tercero[0]);

    this.localizacionChanged(this.adeudosPasivosForm.value.adeudo.localizacionAdeudo.pais);

    this.setSelectedOptions();
  }

  async getUserInfo() {
    try {
      const { data } = await this.apollo
        .query<DeclaracionOutput>({
          query: adeudosPasivosQuery,
          variables: {
            tipoDeclaracion: this.tipoDeclaracion.toUpperCase(),
          },
        })
        .toPromise();

      this.declaracionId = data.declaracion._id;
      if (data.declaracion.adeudosPasivos) {
        this.setupForm(data.declaracion.adeudosPasivos);
      }
    } catch (error) {
      console.log(error);
    }
  }

  ngOnInit(): void {}

  noDebts() {
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
        const adeudo = [...this.adeudo.slice(0, index), ...this.adeudo.slice(index + 1)];
        const aclaracionesObservaciones = this.adeudosPasivosForm.value.aclaracionesObservaciones;
        this.saveInfo({
          adeudo,
          aclaracionesObservaciones,
        });
      }
    });
  }

  async saveInfo(form: AdeudosPasivos) {
    try {
      const declaracion = {
        adeudosPasivos: form,
      };

      const { data } = await this.apollo
        .mutate<DeclaracionOutput>({
          mutation: adeudosPasivosMutation,
          variables: {
            id: this.declaracionId,
            declaracion,
          },
        })
        .toPromise();

      this.editMode = false;
      if (data.declaracion.adeudosPasivos) {
        this.setupForm(data.declaracion.adeudosPasivos);
      }
      this.presentSuccessAlert();
    } catch (error) {
      console.log(error);
      this.openSnackBar('ERROR: No se guardaron los cambios', 'Aceptar');
    }
  }

  saveItem() {
    let adeudo = [...this.adeudo];
    const aclaracionesObservaciones = this.adeudosPasivosForm.value.aclaracionesObservaciones;
    const newItem = this.adeudosPasivosForm.value.adeudo;

    if (this.editIndex === null) {
      adeudo = [...adeudo, newItem];
    } else {
      adeudo[this.editIndex] = newItem;
    }

    this.isLoading = true;

    this.saveInfo({
      adeudo,
      aclaracionesObservaciones,
    });

    this.isLoading = false;
  }

  setEditMode() {
    this.adeudosPasivosForm.reset();
    this.editMode = true;
    this.editIndex = null;
  }

  setSelectedOptions() {
    const { tipoAdeudo, titular } = this.adeudosPasivosForm.value.adeudo;

    if (tipoAdeudo) {
      this.adeudosPasivosForm.get('adeudo.tipoAdeudo').setValue(findOption(this.tipoAdeudoCatalogo, tipoAdeudo.clave));
    }
    if (titular) {
      this.adeudosPasivosForm.get('adeudo.titular').setValue(findOption(this.titularBienCatalogo, titular[0].clave));
    }
  }

  setupForm(adeudosPasivos: AdeudosPasivos) {
    this.adeudo = adeudosPasivos.adeudo;
    const aclaraciones = adeudosPasivos.aclaracionesObservaciones;

    this.adeudosPasivosForm.get('ninguno').setValue(!!adeudosPasivos.ninguno);

    if (aclaraciones) {
      this.adeudosPasivosForm.get('aclaracionesObservaciones').setValue(aclaraciones);
      this.toggleAclaraciones(true);
    }

    //this.editMode = !!!this.adeudo.length;
  }

  toggleAclaraciones(value: boolean) {
    const aclaraciones = this.adeudosPasivosForm.get('aclaracionesObservaciones');
    if (value) {
      aclaraciones.enable();
    } else {
      aclaraciones.disable();
      aclaraciones.reset();
    }
    this.aclaraciones = value;
  }
}
