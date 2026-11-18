package com.mycem.elderCareRemainderSystem;

import java.util.List;

import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/elders")
public class ElderController {

    private final ElderService service;

    public ElderController(ElderService service) {
        this.service = service;
    }

    @PostMapping
    public Elder addElder(@RequestBody Elder elder) {
        return service.saveElder(elder);
    }

    @GetMapping
    public List<Elder> getAllElders() {
        return service.getAllElders();
    }

    @GetMapping("/{id}")
    public Elder getElder(@PathVariable Long id) {
        return service.getElderById(id);
    }

    @DeleteMapping("/{id}")
    public String deleteElder(@PathVariable Long id) {
        service.deleteElder(id);
        return "Elder deleted successfully";
    }
}