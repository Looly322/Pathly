// Explicit coordinate tags prevent accidental double conversion.
export function toGCJ02(point){
 if(point.coordinateSystem==='GCJ02')return {...point};
 let latitude=Number(point.latitude),longitude=Number(point.longitude);
 if(!Number.isFinite(latitude+longitude))throw Error('INVALID_COORDINATES');
 if(longitude<72.004||longitude>137.8347||latitude<.8293||latitude>55.8271)return {...point,latitude,longitude,coordinateSystem:'WGS84'};
 const x=longitude-105,y=latitude-35,pi=Math.PI;
 let a=-100+2*x+3*y+.2*y*y+.1*x*y+.2*Math.sqrt(Math.abs(x));
 a+=(20*Math.sin(6*x*pi)+20*Math.sin(2*x*pi))*2/3+(20*Math.sin(y*pi)+40*Math.sin(y*pi/3))*2/3+(160*Math.sin(y*pi/12)+320*Math.sin(y*pi/30))*2/3;
 let b=300+x+2*y+.1*x*x+.1*x*y+.1*Math.sqrt(Math.abs(x));
 b+=(20*Math.sin(6*x*pi)+20*Math.sin(2*x*pi))*2/3+(20*Math.sin(x*pi)+40*Math.sin(x*pi/3))*2/3+(150*Math.sin(x*pi/12)+300*Math.sin(x*pi/30))*2/3;
 const rad=latitude*pi/180,m=1-.006693421622965943*Math.sin(rad)**2;
 return {...point,latitude:latitude+a*180/((6378245*(1-.006693421622965943)/(m*Math.sqrt(m)))*pi),longitude:longitude+b*180/(6378245/Math.sqrt(m)*Math.cos(rad)*pi),coordinateSystem:'GCJ02'};
}
export function normalizeDestination(p){return p.countryCode==='CN'?toGCJ02(p):{...p,coordinateSystem:'WGS84'};}
