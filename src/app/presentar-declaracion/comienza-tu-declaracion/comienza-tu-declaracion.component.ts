import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Apollo } from 'apollo-angular';
import { declaracionesMetadata } from '@api/declaracion';
import { DialogComponent } from '@app/@shared';

@Component({
  selector: 'app-comienza-tu-declaracion',
  templateUrl: './comienza-tu-declaracion.component.html',
  styleUrls: ['./comienza-tu-declaracion.component.scss'],
})
export class ComienzaTuDeclaracionComponent implements OnInit {
  tipoDeclaracion: string;

  constructor(private apollo: Apollo, private dialog: MatDialog, private router: Router) {}

  ngOnInit(): void {
    this.tipoDeclaracion = this.router.url.split('/')[1];
  }

  //OMAR: Validar que no se pueda iniciar una declaracion simplificada o completa si ya se tiene una que no se ha terminado
  iniciarDeclaracion(tipo: String, modo: String) {
    //obtener la ultima declaracion
    this.validarDeclaracionIniciada(tipo, modo);

    // this.apollo.query({
    //   query: declaracionesMetadata,
    //   variables: {
    //     filter: {
    //       firmada: false,
    //       tipoDeclaracion: tipo
    //     },
    //   },

    // })
    // .toPromise()
    // .then((result: any)=> {
    //   if(result.data.declaracionesMetadata.docs.length > 0) {
    //     // tiene una declaracion abierta, debe cerrarla para poder comenzar otra
    //     this.dialog.open(DialogComponent, {
    //       data: {
    //         title: 'Error',
    //         message: 'Ya tiene una declaración iniciada, debe finalizarla para poder iniciar otra',
    //         trueText: 'Aceptar',
    //       },
    //     });
    //   }
    //   else {
    //     if(modo === 'simplificada')
    //       this.router.navigate(['/inicial/simplificada/situacion-patrimonial']);
    //     else
    //       this.router.navigate(['/inicial/situacion-patrimonial']);

    //   }
    // });
  }

  async validarDeclaracionIniciada(tipo: String, modo: String) {
    try {
      const { data }: any = await this.apollo
        .query({
          query: declaracionesMetadata,
          variables: {
            filter: {
              firmada: false,
              tipoDeclaracion: tipo,
            },
          },
        })
        .toPromise();

      if (data.declaracionesMetadata.docs.length > 0) {
        // tiene una declaracion abierta, debe cerrarla para poder comenzar otra
        this.dialog.open(DialogComponent, {
          data: {
            title: 'Error',
            message: 'Ya tiene una declaración iniciada, debe finalizarla para poder iniciar otra',
            trueText: 'Aceptar',
          },
        });
      } else {
        if (modo === 'simplificada')
          this.router.navigate(['/' + tipo.toLowerCase() + '/simplificada/situacion-patrimonial']);
        else this.router.navigate(['/inicial/situacion-patrimonial']);
      }
    } catch (error) {
      console.log(error);
    }
  }
}
