import { getData } from "../getData";

const findPermission = (permissions, page, right) => {
    // check per permission if the page and rights request are in there
    for (let permission of permissions) {
        const pages = permission['pages'];
        const rights = permission['rights'];
        if (!rights || !pages || rights.length == 0 || pages.length == 0){
            continue;
        }
        if (!rights.includes("*") && !rights.includes(right)){
            continue;
        }
        if (pages.includes("*") || pages.includes(page)){
            return true;
        }
    }    
    return false
}

const permissionsCheck = (page, right) => {
    if (process.env.PERMISSIONS_DISABLED){
        return true
    }
    // get the permissions
    let permissions = JSON.parse(localStorage.getItem('permissions'));
    // check if filled. Else request the permissions
    if (!permissions || (permissions.length == 0)) {
        const token = localStorage.getItem('token');
        console.log(token)
        if (token || (token.length =! 0)) {
            getData(process.env.API_URL + "/api/v1.0/auth/permissions", token)
            .then(data => {
                localStorage.setItem('permissions', JSON.stringify(data))
                if (!data || (data.length == 0)){
                    return findPermission(data, page, right)
                } else {
                    return false
                }
            })
            .catch((error) => {
                console.log(error)
                return false
            }); 
        } else {
            return false
        }
    } else {
        return findPermission(permissions, page, right)
    }
    

    
}
export default permissionsCheck;