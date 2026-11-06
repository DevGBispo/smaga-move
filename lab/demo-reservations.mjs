import {emptyPlanning,addShip,addContainer,changeRelease} from './ship-planning.mjs';
const base=[
 ['MSC NAPOLI','006E','BTP','2026-11-07T08:00','2026-11-08T12:00','Ana','RES-1001','STONEX - 3429','MSC',12,'40 HC','liberado'],
 ['MSC NAPOLI','006E','BTP','2026-11-07T08:00','2026-11-08T12:00','Ana','RES-1002','NESTLE - 2641','MSC',5,'40 HC','ag_liberacao'],
 ['MSC MICHELA','014W','BTP','2026-11-09T06:00','2026-11-10T12:00','Ana','RES-1003','RHODIA - 3828','HAPAG LLOYD',3,'20 DRY','liberado'],
 ['MSC MICHELA','014W','BTP','2026-11-09T06:00','2026-11-10T12:00','Ana','RES-1004','DANISCO - 3190','MSC',4,'40 HC','pendente'],
 ['MAERSK JAIPUR','032E','DP WORLD','2026-11-08T05:00','2026-11-09T09:00','Bruno','RES-1005','BUNGE - 3531','MAERSK',7,'40 HC','liberado'],
 ['MAERSK JAIPUR','032E','DP WORLD','2026-11-08T05:00','2026-11-09T09:00','Bruno','RES-1006','OXITENO - 3421','MAERSK',2,'20 DRY','ag_liberacao'],
 ['MSC YAMUNA VI','018W','BTP','2026-11-06T20:00','2026-11-07T12:00','Ana','RES-1007','BRIDGESTONE - 626','MSC',6,'40 HC','liberado'],
 ['MSC YAMUNA VI','018W','BTP','2026-11-06T20:00','2026-11-07T12:00','Ana','RES-1008','NESTLE - 3612','MSC',2,'20 DRY','pendente'],
 ['SANTA VANESSA','023S','DP WORLD','2026-11-06T18:00','2026-11-07T12:00','Bruno','RES-1009','TERMO - 3145','HAPAG LLOYD',4,'20 DRY','liberado'],
 ['STEPHANIE C','011E','DP WORLD','2026-11-12T07:00','2026-11-13T12:00','Bruno','RES-1010','CITROSUCO - 2232','MAERSK',5,'20 DRY','ag_liberacao']
];
export function demoPlanning(){
 let state=emptyPlanning();
 for(const [name,voyage,terminal,eta,deadline,owner,reference,client,carrier,quantity,size,release] of base){
  let ship=state.ships.find(s=>s.name===name&&s.voyage===voyage);
  if(!ship){const result=addShip(state,{name,voyage,terminal,eta,deadline,owner});state=result.state;ship=result.ship;}
  const plannedDate=deadline.slice(0,10);
  for(let i=0;i<quantity;i++){
   const result=addContainer(state,ship.id,{reference,client,plannedDate},owner);state=result.state;
   state=changeRelease(state,ship.id,result.container.id,release,owner).state;
  }
 }
 return {state,reservations:base.map(([name,voyage,terminal,eta,deadline,owner,reference,client,carrier,quantity,size,release])=>({name,voyage,terminal,eta,deadline,owner,reference,client,carrier,quantity,size,release}))};
}
