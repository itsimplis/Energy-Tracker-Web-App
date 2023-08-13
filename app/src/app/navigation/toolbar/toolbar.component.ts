import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss']
})
export class ToolbarComponent {

  @Output() public sidenavToggle = new EventEmitter();

  onToggleSidenav() {
    this.sidenavToggle.emit();
  }
}
