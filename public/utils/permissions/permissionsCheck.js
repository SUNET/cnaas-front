
const permissionsCheck = (page, right) => {
    // get the permissions
    const permissions = JSON.parse(localStorage.getItem('permissions'));
    // check if filled. Else always denied
    if (!permissions || (permissions.length == 0)) {
        return false
    }
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
export default permissionsCheck;