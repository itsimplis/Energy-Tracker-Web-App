import { Component, HostListener, ViewChild } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'Home Energy Consumption Monitor';

  @ViewChild('sidenav') sidenav!: MatSidenav;

  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.adjustSidenav();
  }

  ngOnInit() {
    this.adjustSidenav();
  }

  adjustSidenav() {
    if (window.innerWidth > 768) {
      this.sidenav.mode = 'side';
      this.sidenav.opened = true;
    } else {
      this.sidenav.mode = 'over';
      this.sidenav.opened = false;
    }
  }

}
