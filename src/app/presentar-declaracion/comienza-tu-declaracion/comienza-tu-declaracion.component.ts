import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-comienza-tu-declaracion',
  templateUrl: './comienza-tu-declaracion.component.html',
  styleUrls: ['./comienza-tu-declaracion.component.scss'],
})
export class ComienzaTuDeclaracionComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {}

  //OMAR: Validar que no se pueda iniciar una declaracion simplificada o completa si ya se tiene una que no se ha terminado
}
