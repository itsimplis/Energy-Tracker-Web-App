import { Component, OnInit, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.scss']
})

export class SidenavComponent {
  @Output() sidenavClose = new EventEmitter();

  onSidenavClose() {
    this.sidenavClose.emit();
  }
}
