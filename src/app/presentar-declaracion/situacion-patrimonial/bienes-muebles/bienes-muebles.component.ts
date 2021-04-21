import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { Apollo } from 'apollo-angular';
import { bienesMueblesMutation, bienesMueblesQuery } from '@api/declaracion';

import { MatDialog } from '@angular/material/dialog';
import { DialogComponent } from '@shared/dialog/dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';

import TipoBienBienesMuebles from '@static/catalogos/tipoBienBienesMuebles.json';
import FormaAdquisicion from '@static/catalogos/formaAdquisicion.json';
import TitularBien from '@static/catalogos/titularBien.json';
import FormaPago from '@static/catalogos/formaPago.json';
import ParentescoRelacion from '@static/catalogos/parentescoRelacion.json';
import ValorConformeA from '@static/catalogos/valorConformeA.json';
import Monedas from '@static/catalogos/monedas.json';

import { tooltipData } from '@static/tooltips/bienes-muebles';

import { BienMueble, BienesMuebles, DeclaracionOutput } from '@models/declaracion';

import { findOption } from '@utils/utils';
import { Constantes } from '@app/@shared/constantes';

@Component({
  selector: 'app-bienes-muebles',
  templateUrl: './bienes-muebles.component.html',
  styleUrls: ['./bienes-muebles.component.scss'],
})
export class BienesMueblesComponent implements OnInit {
  aclaraciones = false;
  bienesMueblesForm: FormGroup;
  editMode = false;
  editIndex: number = null;
  bienMueble: BienMueble[] = [];
  isLoading = false;

  tipoBienBienesMueblesCatalogo = TipoBienBienesMuebles;
  formaAdquisicionCatalogo = FormaAdquisicion;
  titularBienCatalogo = TitularBien;
  formaPagoCatalogo = FormaPago;
  parentescoRelacionCatalogo = ParentescoRelacion;
  valorConformeACatalogo = ValorConformeA;
  monedasCatalogo = Monedas;

  tipoDeclaracion: string = null;

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
    //this.bienesMueblesForm.reset();
    this.createForm();
    this.bienesMueblesForm.get('ninguno').setValue(false);
    this.editMode = true;
    this.editIndex = null;
  }

  cancelEditMode() {
    this.editMode = false;
    this.editIndex = null;
  }

  createForm() {
    this.bienesMueblesForm = this.formBuilder.group({
      ninguno: [false],
      bienMueble: this.formBuilder.group({
        titular: [[], Validators.required],
        tipoBien: [{ clave: '', valor: '' }, Validators.required],
        transmisor: this.formBuilder.group({
          tipoPersona: ['', [Validators.required]],
          nombreRazonSocial: ['', [Validators.required, Validators.pattern(/^\S.*$/)]],
          rfc: ['', [Validators.required, Validators.pattern(Constantes.VALIDACION_RFC)]],
          relacion: ['', Validators.required],
        }),
        tercero: this.formBuilder.group({
          tipoPersona: ['FISICA', [Validators.required]],
          nombreRazonSocial: ['', [Validators.required, Validators.pattern(/^\S.*$/)]],
          rfc: ['', [Validators.required, Validators.pattern(Constantes.VALIDACION_RFC)]],
        }),
        descripcionGeneralBien: ['', [Validators.required, Validators.pattern(/^\S.*$/)]],
        formaAdquisicion: [{ clave: '', valor: '' }, Validators.required],
        formaPago: ['', [Validators.required]],
        valorAdquisicion: this.formBuilder.group({
          valor: [0, [Validators.required, Validators.pattern(/^\d+\.?\d{0,2}$/), Validators.min(0)]],
          moneda: ['MXN', [Validators.required]],
        }),
        fechaAdquisicion: ['', [Validators.required]],
        motivoBaja: { disabled: true, value: '' },
      }),
      aclaracionesObservaciones: [{ disabled: true, value: '' }, [Validators.required, Validators.pattern(/^\S.*\S$/)]],
    });

    ///////////////////////////// OMAR
    this.bienesMueblesForm.get('bienMueble.titular').valueChanges.subscribe((val) => {
      if (!val) return;

      const razonSocial = this.bienesMueblesForm.get('bienMueble.tercero').get('nombreRazonSocial');
      const tipoPersona = this.bienesMueblesForm.get('bienMueble.tercero').get('tipoPersona');
      const rfc = this.bienesMueblesForm.get('bienMueble.tercero').get('rfc');

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
    this.fillForm(this.bienMueble[index]);
    this.editIndex = index;
  }

  fillForm(bienMueble: BienMueble) {
    Object.keys(bienMueble)
      .filter((field) => bienMueble[field] !== null)
      .forEach((field) => this.bienesMueblesForm.get(`bienMueble.${field}`).patchValue(bienMueble[field]));
    this.bienesMueblesForm.get(`bienMueble.tercero`).patchValue(bienMueble.tercero[0]);
    this.bienesMueblesForm.get(`bienMueble.transmisor`).patchValue(bienMueble.transmisor[0]);

    this.setSelectedOptions();
  }

  async getUserInfo() {
    try {
      const { data } = await this.apollo
        .query<DeclaracionOutput>({
          query: bienesMueblesQuery,
          variables: {
            tipoDeclaracion: this.tipoDeclaracion.toUpperCase(),
          },
        })
        .toPromise();

      this.declaracionId = data.declaracion._id;
      if (data.declaracion.bienesMuebles) {
        this.setupForm(data.declaracion.bienesMuebles);
      }
    } catch (error) {
      console.log(error);
    }
  }

  ngOnInit(): void {}

  noPossessions() {
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
        const bienMueble = [...this.bienMueble.slice(0, index), ...this.bienMueble.slice(index + 1)];
        const aclaracionesObservaciones = this.bienesMueblesForm.value.aclaracionesObservaciones;
        this.saveInfo({
          bienMueble,
          aclaracionesObservaciones,
        });
      }
    });
  }

  async saveInfo(form: BienesMuebles) {
    console.log(form);
    try {
      const declaracion = {
        bienesMuebles: form,
      };
      const { data } = await this.apollo
        .mutate<DeclaracionOutput>({
          mutation: bienesMueblesMutation,
          variables: {
            id: this.declaracionId,
            declaracion,
          },
        })
        .toPromise();

      this.editMode = false;
      if (data.declaracion.bienesMuebles) {
        this.setupForm(data.declaracion.bienesMuebles);
      }
      this.presentSuccessAlert();
    } catch (error) {
      console.log(error);
      this.openSnackBar('ERROR: No se guardaron los cambios', 'Aceptar');
    }
  }

  saveItem() {
    let bienMueble = [...this.bienMueble];
    const aclaracionesObservaciones = this.bienesMueblesForm.value.aclaracionesObservaciones;
    const newItem = this.bienesMueblesForm.value.bienMueble;

    if (this.editIndex === null) {
      bienMueble = [...bienMueble, newItem];
    } else {
      bienMueble[this.editIndex] = newItem;
    }

    this.isLoading = true;

    this.saveInfo({
      bienMueble,
      aclaracionesObservaciones,
    });

    this.isLoading = false;
  }

  setEditMode() {
    //this.bienesMueblesForm.reset();
    this.createForm();
    this.bienesMueblesForm.get('ninguno').setValue(false);
    this.editMode = true;
    this.editIndex = null;
  }

  setSelectedOptions() {
    const { tipoBien, titular, formaAdquisicion } = this.bienesMueblesForm.value.bienMueble;

    const { relacion } = this.bienesMueblesForm.value.bienMueble.transmisor;

    if (tipoBien) {
      this.bienesMueblesForm
        .get('bienMueble.tipoBien')
        .setValue(findOption(this.tipoBienBienesMueblesCatalogo, tipoBien));
    }
    if (titular) {
      this.bienesMueblesForm.get('bienMueble.titular').setValue(findOption(this.titularBienCatalogo, titular[0].clave));
    }
    if (formaAdquisicion) {
      this.bienesMueblesForm
        .get('bienMueble.formaAdquisicion')
        .setValue(findOption(this.formaAdquisicionCatalogo, formaAdquisicion.clave));
    }

    if (relacion) {
      this.bienesMueblesForm
        .get('bienMueble.transmisor.relacion')
        .setValue(findOption(this.parentescoRelacionCatalogo, relacion.clave));
    }
  }

  setupForm(bienesMuebles: BienesMuebles) {
    this.bienMueble = bienesMuebles.bienMueble;
    const aclaraciones = bienesMuebles.aclaracionesObservaciones;

    if (bienesMuebles.ninguno) {
      this.bienesMueblesForm.get('ninguno').patchValue(true);
    }

    if (aclaraciones) {
      this.bienesMueblesForm.get('aclaracionesObservaciones').setValue(aclaraciones);
      this.toggleAclaraciones(true);
    }
  }

  toggleAclaraciones(value: boolean) {
    const aclaraciones = this.bienesMueblesForm.get('aclaracionesObservaciones');
    if (value) {
      aclaraciones.enable();
    } else {
      aclaraciones.disable();
      aclaraciones.reset();
    }
    this.aclaraciones = value;
  }
}
