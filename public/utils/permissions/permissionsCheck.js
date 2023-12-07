var globToRegExp = require('glob-to-regexp');
const checkApiCall = (apiCall, permissions) => {
    for (let permission of permissions) {
        const allowed_methods = permission['methods'];
        const allowed_endpoints = permission['endpoints'];
        if (!allowed_methods.includes("*") && !allowed_methods.includes(apiCall[0])){
            continue;
        }
        if (allowed_endpoints.includes("*") || allowed_endpoints.includes(apiCall[1])){
            
            return true;
        } 
        // added the glob so it's easier to add a bunch of api calls (like all /device api calls)
        for(let allowed_endpoint in allowed_endpoints) {
            const re = globToRegExp(allowed_endpoint);
            if (re.test(apiCall[1])) {
                return true;
            }
        }
    }
    return false;
}
const permissionsCheck = (page, right) => {
    // wanneer verversen ? 
    // als nieuw token 
    // TODO verversen token
    const permissions = JSON.parse(localStorage.getItem('permissions'));
    //console.log(permissions)
    if (!permissions || permissions.length == 0) {
        return false
    }
    for (let permission of permissions) {
        const pages = permission['pages'];
        const rights = permission['rights'];
        if (!rights || !pages || rights.length == 0 || pages.length ==0){
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
export default permissionsCheck;