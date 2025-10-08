import Swal from 'sweetalert2';

export default function pre({ icon, title, text, timer, background, color }){
  return Swal.fire({
    icon: icon,
    title: title,
    text: text,
    timer: timer,
    background: background,
    color:color,
  });
}

