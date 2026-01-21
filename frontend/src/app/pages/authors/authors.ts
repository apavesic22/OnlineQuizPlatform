import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-authors',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule, MatDialogModule],
  templateUrl: './authors.html',
  styleUrls: ['./authors.scss']
})
export class AuthorsComponent {
  andrej = {
    name: 'Andrej',
    surname: 'Pavešić',
    profession: 'Student at FOI',
    location: 'Varaždin, Croatia',
    email: 'apavesic22@student.foi.hr',
    imageUrl: '../../../../../uploads/Profilna.jpg'
  };

  roman = {
    name: 'Roman',
    surname: 'Protsak',
    profession: 'Your profession here',
    location: 'Your location here',
    email: 'Your email here',
    imageUrl: 'Your image URL here'
  }

  constructor(private dialog: MatDialog) {}

  openDiagram() {
  this.dialog.open(DiagramModalComponent, {
    data: { imageSrc: '../../../../../uploads/ERdiagram.svg' },
    width: '98vw',        
    maxWidth: '98vw',    
    height: '90vh',      
    panelClass: 'full-screen-modal' 
  });
}
}

@Component({
  selector: 'app-diagram-modal',
  standalone: true,
  imports: [MatDialogModule, MatIconModule, MatButtonModule],
  template: `
    <div style="position: relative; background: #1e293b; padding: 10px; border-radius: 8px;">
      <button mat-icon-button mat-dialog-close style="position: absolute; right: 0; top: 0; color: white; z-index: 10;">
        <mat-icon>close</mat-icon>
      </button>
      <img [src]="data.imageSrc" style="width: 100%; height: auto; display: block; filter: brightness(0.9);" />
    </div>
  `
})
export class DiagramModalComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { imageSrc: string }) {}
}