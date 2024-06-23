export class LatlngPoint {
    public lat: number
    public lng: number

	constructor(lat: number, lng: number) {
        this.lng = lng
        this.lat = lat
    }


    calcDistance(other: LatlngPoint): number {
        const R = 6371e3; // metres
        const psi1 = this.lat * Math.PI/180; // φ, λ in radians
        const psi2 = other.lat * Math.PI/180;
        const delPsi = (other.lat - this.lat) * Math.PI/180;
        const delLambda = (other.lng - this.lng) * Math.PI/180;

        const a = Math.sin(delPsi/2) * Math.sin(delPsi/2) +
            Math.cos(psi1) * Math.cos(psi2) *
            Math.sin(delLambda/2) * Math.sin(delLambda/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c; // in metres
    }
}