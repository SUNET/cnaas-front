// Function to toggle elements given its ID
function toggle_it(itemID){
    if ((document.getElementById(itemID).style.display == 'none')) {
	document.getElementById(itemID).style.display = ''
	event.preventDefault()
    } else {
	document.getElementById(itemID).style.display = 'none';
	event.preventDefault()
    }
}
